import { MemoryStore } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

/* =========================================================
   RATE-LIMIT BACKING STORE
   ---------------------------------------------------------
   WHY THIS FILE EXISTS
   express-rate-limit counts hits in a "store". Its default,
   MemoryStore, lives inside one Node process:

     ✗ counts are lost whenever the process restarts
     ✗ two instances each keep their own private count, so an
       attacker gets `limit` attempts PER INSTANCE instead of
       `limit` attempts total

   Setting REDIS_URL fixes both: every instance reads/writes the
   same Redis keys, and counts survive restarts.

   HOW TO TURN IT ON
     1. Run Redis anywhere (local `redis-server`, Docker:
        `docker run -p 6379:6379 redis`, or a hosted Redis)
     2. Add to .env:   REDIS_URL=redis://127.0.0.1:6379
     3. Restart the server. On boot you should see:
        `🚦 Rate limiter: Redis store (redis://127.0.0.1:6379)`

   Leaving REDIS_URL unset keeps today's behaviour exactly:
   MemoryStore, zero extra infrastructure, ideal for local dev.

   WHERE IT PLUGS IN
   src/middlewares/rateLimit.middleware.js calls
   `createRateLimitStore()` once and passes the result to every
   `authLimiter({...})` via the `store:` option.

   FAILURE POLICY (deliberate)
   Auth must never be taken down by a cache outage, so this is
   fail-open: if Redis stops answering, hit counts fall through
   to a per-process MemoryStore and the server keeps running.
   The trade-off is that during a Redis outage each instance
   counts independently again — same as today's default. A loud
   log line is emitted when that happens.
   ========================================================= */

const REDIS_FAIL_OPEN_AFTER = 3;
const REDIS_COMMAND_TIMEOUT_MS = 2000;

/**
 * Wraps a preferred store (Redis) and a guaranteed-available fallback
 * (Memory). Every method tries the preferred store first; after
 * REDIS_FAIL_OPEN_AFTER consecutive failures it stops trying for the
 * rest of the process lifetime and logs once, so a dead Redis cannot
 * add multi-second latency to every login attempt.
 */
class ResilientStore {
  #primary;

  #fallback;

  #label;

  #failures = 0;

  #exhausted = false;

  constructor(primary, fallback, label) {
    this.#primary = primary;
    this.#fallback = fallback;
    this.#label = label;
  }

  get #useFallback() {
    return this.#exhausted;
  }

  #recordFailure(error) {
    this.#failures += 1;

    if (this.#failures < REDIS_FAIL_OPEN_AFTER) {
      console.warn(
        `⚠ Rate-limit store "${this.#label}" failed (${error?.message || error}); falling back for this request. ` +
          `${REDIS_FAIL_OPEN_AFTER - this.#failures} more failure(s) before falling back permanently.`
      );
      return;
    }

    this.#exhausted = true;
    console.error(
      `🛑 Rate-limit store "${this.#label}" is unavailable — falling back to the in-memory store for this process. ` +
        `Limits are now per-instance until the server restarts. Cause: ${error?.message || error}`
    );
  }

  #recordSuccess() {
    this.#failures = 0;
  }

  async increment(key) {
    if (!this.#useFallback) {
      try {
        const result = await this.#withTimeout(this.#primary.increment(key));
        this.#recordSuccess();
        return result;
      } catch (error) {
        this.#recordFailure(error);
      }
    }

    return this.#fallback.increment(key);
  }

  async decrement(key) {
    if (!this.#useFallback) {
      try {
        const result = await this.#withTimeout(this.#primary.decrement(key));
        this.#recordSuccess();
        return result;
      } catch (error) {
        this.#recordFailure(error);
      }
    }

    return this.#fallback.decrement(key);
  }

  async resetKey(key) {
    if (!this.#useFallback) {
      try {
        await this.#withTimeout(this.#primary.resetKey(key));
        this.#recordSuccess();
        return;
      } catch (error) {
        this.#recordFailure(error);
      }
    }

    return this.#fallback.resetKey(key);
  }

  /** Called by express-rate-limit on shutdown; releases the Redis sockets. */
  async shutdown() {
    await Promise.resolveSettled([this.#primary?.shutdown?.(), this.#fallback?.shutdown?.()]);
  }

  #withTimeout(promise) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`rate-limit store timed out after ${REDIS_COMMAND_TIMEOUT_MS}ms`)),
          REDIS_COMMAND_TIMEOUT_MS
        );
        // Never keep the event loop alive just for a rate-limit probe.
        timer.unref?.();
      }),
    ]);
  }
}

let cachedStore = null;

/**
 * Builds the store used by every auth limiter. Called once at boot.
 *
 * @returns {import('express-rate-limit').Store} Redis-backed when REDIS_URL
 *          is set, otherwise the default in-memory store.
 */
export const createRateLimitStore = () => {
  if (cachedStore) {
    return cachedStore;
  }

  const redisUrl = process.env.REDIS_URL?.trim();

  if (!redisUrl) {
    console.log(
      '🚦 Rate limiter: in-memory store (set REDIS_URL=redis://… to share counts across restarts/instances)'
    );
    cachedStore = new MemoryStore();
    return cachedStore;
  }

  const client = new Redis(redisUrl, {
    // Fail fast instead of queueing commands while Redis is down — a rate
    // limiter must not become the slowest part of a login request.
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: REDIS_COMMAND_TIMEOUT_MS,
    maxRetriesPerRequest: 1,
    // A Redis blip must never crash the auth process via an unhandled
    // 'error' event; ResilientStore already handles the fallback.
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });

  client.on('error', (error) => {
    if (!client.isReady) {
      console.warn(`⚠ Redis (rate limiter) connection issue: ${error.message}`);
    }
  });

  const redisStore = new RedisStore({
    // rate-limit-redis speaks raw Redis commands; ioredis's `call` is the
    // matching primitive (`...args` is e.g. ['INCRBY', key, '1']).
    sendCommand: (...args) => client.call(...args),
    prefix: 'pc:ratelimit:',
  });

  cachedStore = new ResilientStore(redisStore, new MemoryStore(), 'redis');
  console.log(`🚦 Rate limiter: Redis store (${redisUrl})`);

  return cachedStore;
};
