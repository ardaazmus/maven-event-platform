// ponytail: in-memory rate limit, Redis when multi-instance
const buckets = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }
  if (b.count >= limit) return { allowed: false, remaining: 0 }
  b.count++
  return { allowed: true, remaining: limit - b.count }
}

export function checkQuota(used: number, quota: number): boolean {
  return used < quota
}

// Test helper to reset
export function _resetRateLimit(){ buckets.clear() }
