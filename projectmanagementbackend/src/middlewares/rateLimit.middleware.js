import { HOUR, MINUTE, ipKeyGenerator, rateLimit } from 'express-rate-limit';

/* =========================================================
   AUTH RATE LIMITING
   ---------------------------------------------------------
   Purpose: make credential guessing expensive.

     login     → counts FAILURES only (a legitimate user who logs in
                 successfully is never penalised)
     register  → every request counts (each one creates an account)

   Keys are `scope:ip:identifier` where the identifier is the email/username
   from the body — so one attacker IP is limited both globally and per target
   account. `ipKeyGenerator` groups IPv6 addresses by /56 subnet (required
   when you supply your own key generator).

   The default MemoryStore is per-process: correct for a single instance.
   A multi-instance deployment needs a shared store (Redis) or sticky
   sessions — see docs/04 § 10.
   ========================================================= */

const humanize = (seconds) => {
  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  }

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }

  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
};

const handler = (req, res) => {
  const resetTime = req.rateLimit?.resetTime;
  const retryAfter = resetTime
    ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
    : 60;

  res.set('Retry-After', String(retryAfter));

  // Same envelope as every other error; `errors: ['RATE_LIMITED']` is the
  // machine-readable marker (cf. INVALID_TOKEN / EMAIL_NOT_VERIFIED).
  return res.status(429).json({
    success: false,
    message: `Too many attempts. Please try again in ${humanize(retryAfter)}.`,
    errors: ['RATE_LIMITED'],
  });
};

/**
 * @param {object}   options
 * @param {string}   options.scope          bucket namespace, keeps limiters independent
 * @param {number}   options.windowMs       rolling window length
 * @param {number}   options.limit          allowed requests per window
 * @param {Function} [options.identifier]   (req) => string, narrows the key to an account
 * @param {boolean}  [options.countSuccesses=false]
 *        true  → every request counts (account-creating endpoints)
 *        false → only failures count (credential-checking endpoints)
 */
const authLimiter = ({
  scope,
  windowMs,
  limit,
  identifier,
  countSuccesses = false,
}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: !countSuccesses,
    keyGenerator: (req) => {
      // Never trust a proxy header here: trusting X-Forwarded-For without a
      // configured proxy lets a client spoof its own key and bypass the limit.
      const ip = ipKeyGenerator(req.ip || '0.0.0.0');
      const target = identifier?.(req);
      return target ? `${scope}:${ip}:${target}` : `${scope}:${ip}`;
    },
    handler,
  });

const loginIdentifier = (req) =>
  String(req.body?.email || req.body?.username || '')
    .trim()
    .toLowerCase();

/** 10 failed logins per IP + account per 15 minutes. */
export const loginLimiter = authLimiter({
  scope: 'login',
  windowMs: 15 * MINUTE,
  limit: 10,
  identifier: loginIdentifier,
});

/** 10 new accounts per IP per hour (the whole lifetime, not just failures). */
export const registerLimiter = authLimiter({
  scope: 'register',
  windowMs: HOUR,
  limit: 10,
  countSuccesses: true,
});
