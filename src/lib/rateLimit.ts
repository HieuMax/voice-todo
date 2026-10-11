/**
 * Rate limiting and one-shot reservations.
 *
 * When Upstash Redis is configured (UPSTASH_REDIS_REST_URL + ..._TOKEN) the
 * counters live in Redis so limits survive restarts and are shared across
 * instances. Otherwise it transparently falls back to an in-process store,
 * which is fine for local/dev but per-instance at scale.
 */

const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = Boolean(redisUrl && redisToken);

async function redisPipeline(commands: (string | number)[][]): Promise<unknown[]> {
  const response = await fetch(`${redisUrl}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Upstash pipeline failed: ${response.status}`);
  }
  const data = (await response.json()) as { result: unknown }[];
  return data.map((entry) => entry.result);
}

async function redisCommand(command: (string | number)[]): Promise<unknown> {
  const response = await fetch(`${redisUrl as string}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Upstash command failed: ${response.status}`);
  }
  const data = (await response.json()) as { result: unknown };
  return data.result;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
}

const MAX_KEYS = 10_000;

const buckets = new Map<string, { count: number; resetAt: number }>();

function prune(now: number): void {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  prune(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, retryAfter: 0 };
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (!useRedis) return memoryRateLimit(key, limit, windowMs);

  try {
    const [countRaw, , pttlRaw] = await redisPipeline([
      ["INCR", key],
      ["PEXPIRE", key, windowMs, "NX"],
      ["PTTL", key],
    ]);
    const count = Number(countRaw);
    const pttl = Number(pttlRaw);

    if (count > limit) {
      const remainingMs = pttl > 0 ? pttl : windowMs;
      return { ok: false, remaining: 0, retryAfter: Math.max(1, Math.ceil(remainingMs / 1000)) };
    }
    return { ok: true, remaining: Math.max(0, limit - count), retryAfter: 0 };
  } catch (error) {
    console.error("[rateLimit] Redis unavailable, using in-memory fallback:", error);
    return memoryRateLimit(key, limit, windowMs);
  }
}

const reservations = new Map<string, number>();

function pruneReservations(now: number): void {
  if (reservations.size < MAX_KEYS) return;
  for (const [key, expiresAt] of reservations) {
    if (expiresAt <= now) reservations.delete(key);
  }
}

/**
 * Atomically reserve `key` for `ttlMs`. Returns true the first time only;
 * subsequent calls within the TTL return false. Used for duplicate suppression.
 */
export async function reserveOnce(key: string, ttlMs: number): Promise<boolean> {
  if (useRedis) {
    try {
      const result = await redisCommand(["SET", key, "1", "NX", "PX", ttlMs]);
      return result === "OK";
    } catch (error) {
      console.error("[reserveOnce] Redis unavailable, using in-memory fallback:", error);
    }
  }

  const now = Date.now();
  pruneReservations(now);
  const existing = reservations.get(key);
  if (existing && existing > now) return false;
  reservations.set(key, now + ttlMs);
  return true;
}
