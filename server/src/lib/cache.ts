// Tiny in-process TTL cache for hot, read-heavy, non-critical-freshness
// endpoints (public program listings, admin dashboard stats) — cuts
// repeated DB round-trips when many users load the same page around
// the same time, without the operational cost of standing up Redis.
//
// Deliberately short TTLs and no cross-request invalidation on writes:
// this is a "shave off duplicate reads within a few seconds" cache, not
// a source of truth, so a stale read is at most a few seconds old and
// self-heals on the next expiry — not worth the bug surface of wiring
// invalidation into every mutation across every service.
const store = new Map<string, { value: unknown; expiresAt: number }>();

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value as T;
  }

  const value = await fn();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}
