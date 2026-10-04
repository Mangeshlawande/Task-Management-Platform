import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MailCheck, Mail, RefreshCw, ArrowLeft } from 'lucide-react';
import { authApi } from '../../api/auth.js';
import { ApiError } from '../../api/client.js';
import { useAuthStore } from '../../stores/authStore.js';
import { validateEmail } from '../../lib/validators.js';
import { Button, Field } from '../../components/ui/index.js';
import { toast } from '../../stores/uiStore.js';

const LENGTH = 6;
// Keep this under the backend's 60s server-side cooldown (EmailOtpPolicy).
const RESEND_COOLDOWN = 30;

/**
 * P1.0 — Email verification (OTP).
 * Contract: POST /auth/verify-otp { email, otp } → 200 { user, accessToken,
 * refreshToken } and httpOnly cookies — verifying logs the user in, so we only
 * have to update the store and <RedirectIfAuthed> sends them on to `from`
 * (docs/04 § 1). Wrong codes count down 5 attempts; resending is cooldown-gated.
 *
 * `location.state` may carry { email, devOtp, from } — `devOtp` is only ever
 * set outside production (the API echoes the code when NODE_ENV !== production).
 */
export function VerifyEmailPage() {
  const location = useLocation();
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState(location.state?.email || '');
  const [digits, setDigits] = useState(() => Array(LENGTH).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [formError, setFormError] = useState(null);
  const [devOtp, setDevOtp] = useState(location.state?.devOtp || null);
  const [cooldown, setCooldown] = useState(
    location.state?.devOtp ? RESEND_COOLDOWN : 0,
  );

  const inputs = useRef([]);
  const inFlight = useRef(false); // guards the auto-submit vs. button race

  const ticking = cooldown > 0;

  // The countdown lives in an effect so unmounting can't leak a timer.
  useEffect(() => {
    if (!ticking) return undefined;
    const timer = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(timer);
  }, [ticking]);

  // When we already know the email (came from register/login) start in the code.
  useEffect(() => {
    if (location.state?.email) inputs.current[0]?.focus();
  }, [location.state?.email]);

  const code = digits.join('');

  /** Distribute a string of digits across the boxes and focus sensibly. */
  const fillCode = (chars) => {
    const next = Array(LENGTH).fill('');
    chars
      .slice(0, LENGTH)
      .split('')
      .forEach((char, i) => {
        next[i] = char;
      });
    setDigits(next);
    inputs.current[Math.min(chars.length, LENGTH - 1)]?.focus();
    return next;
  };

  const verify = async (value) => {
    const otp = value ?? code;

    if (inFlight.current) return;
    if (validateEmail(email)) {
      setFormError('Enter the email address you registered with.');
      return;
    }
    if (otp.length !== LENGTH) {
      setFormError(`Enter the ${LENGTH}-digit code from your email.`);
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setFormError(null);

    try {
      const data = await authApi.verifyEmailOtp({ email: email.trim(), otp });
      // Cookies are already set by the API, so a store update is the whole job.
      setUser(data?.user ?? null);
      toast.success('Email verified — welcome to Project Camp!');
    } catch (err) {
      setDigits(Array(LENGTH).fill(''));
      inputs.current[0]?.focus();
      setFormError(
        err instanceof ApiError
          ? err.message
          : 'Could not verify the code. Please try again.',
      );
      if (err instanceof ApiError && err.status === 429) {
        setCooldown(RESEND_COOLDOWN);
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  const handleChange = (index, raw) => {
    const typed = raw.replace(/\D/g, '');

    if (!typed) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    const next = [...digits];
    typed
      .split('')
      .slice(0, LENGTH - index)
      .forEach((char, offset) => {
        next[index + offset] = char;
      });
    setDigits(next);

    if (next.every(Boolean)) {
      verify(next.join('')); // auto-submit: 6 digits is unambiguous
      return;
    }
    inputs.current[Math.min(index + typed.length, LENGTH - 1)]?.focus();
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault();
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      inputs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      inputs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < LENGTH - 1) {
      event.preventDefault();
      inputs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, LENGTH);

    if (!pasted) return;
    event.preventDefault();
    const next = fillCode(pasted);
    if (next.every(Boolean)) verify(next.join(''));
  };

  const useDevOtp = () => {
    if (!devOtp) return;
    const next = fillCode(devOtp);
    if (next.every(Boolean)) verify(next.join(''));
  };

  const resend = async () => {
    if (cooldown > 0 || resending) return;
    if (validateEmail(email)) {
      setFormError('Enter the email address you registered with.');
      return;
    }

    setResending(true);
    setFormError(null);

    try {
      const data = await authApi.resendEmailOtp(email.trim());
      if (data?.devOtp) setDevOtp(data.devOtp);
      setDigits(Array(LENGTH).fill(''));
      inputs.current[0]?.focus();
      setCooldown(RESEND_COOLDOWN);
      toast.success('A new code is on its way.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setCooldown(RESEND_COOLDOWN); // server cooldown still running
      }
      setFormError(
        err instanceof ApiError ? err.message : 'Could not resend the code.',
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="app-card p-6 sm:p-8">
        <MailCheck className="h-10 w-10 text-primary" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold text-foreground dark:text-dark-foreground">
          Verify your email
        </h1>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">
          We sent a {LENGTH}-digit code
          {location.state?.email ? (
            <>
              {' '}
              to{' '}
              <span className="font-medium text-foreground dark:text-dark-foreground">
                {location.state.email}
              </span>
            </>
          ) : null}
          . Enter it below to activate your account.
        </p>

        {devOtp && (
          <div className="mt-4 rounded-lg border border-dashed border-primary/50 bg-primary/5 px-3 py-2 text-sm">
            <p className="font-medium text-primary">Development mode</p>
            <p className="mt-1 text-xs text-muted dark:text-dark-muted">
              The API returns the code while <code>NODE_ENV</code> isn&rsquo;t
              &ldquo;production&rdquo;.
            </p>
            <button
              type="button"
              onClick={useDevOtp}
              className="mt-1 font-mono text-lg font-semibold tracking-[0.3em] text-primary hover:underline"
            >
              {devOtp}
            </button>
            <span className="ml-2 text-xs text-muted dark:text-dark-muted">
              — click to fill
            </span>
          </div>
        )}

        {formError && (
          <div
            className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
            role="alert"
          >
            {formError}
          </div>
        )}

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            verify();
          }}
          noValidate
        >
          <Field
            label="Email"
            htmlFor="verify-email"
            hint="Use the address you signed up with"
          >
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                id="verify-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="app-input pl-9"
                placeholder="jane@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFormError(null);
                }}
              />
            </div>
          </Field>

          <fieldset>
            <legend className="app-label">Verification code</legend>
            <div className="mt-1 flex gap-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  disabled={submitting}
                  value={digit}
                  onChange={(event) => handleChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onPaste={handlePaste}
                  onFocus={(event) => event.target.select()}
                  aria-label={`Digit ${index + 1} of ${LENGTH}`}
                  className={`app-input w-full px-0 text-center text-lg font-semibold ${
                    formError ? 'app-input-error' : ''
                  }`}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted dark:text-dark-muted">
              Expires 10 minutes after it was sent. You can paste the whole code.
            </p>
          </fieldset>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={submitting}
          >
            {submitting ? 'Verifying…' : 'Verify email'}
          </Button>
        </form>

        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full"
          onClick={resend}
          disabled={cooldown > 0}
          loading={resending}
        >
          {!resending && <RefreshCw className="h-4 w-4" aria-hidden />}
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </Button>

        <p className="mt-6 text-center text-sm text-muted dark:text-dark-muted">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
