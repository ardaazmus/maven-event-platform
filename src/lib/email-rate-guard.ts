export type EmailRateLimitScope = 'provider' | 'workspace' | 'domain'

export type EmailRateLimit = {
  scope: EmailRateLimitScope
  max: number
  windowMs: number
}

export type EmailRateUsage = {
  scope: EmailRateLimitScope
  count: number
  windowStartedAt: number
}

export type EmailRateDecision = {
  status: 'allowed' | 'deferred'
  selectedScope: EmailRateLimitScope
  remaining: number
  retryAt: number | null
}

function validateLimit(limit: EmailRateLimit): void {
  if (!['provider', 'workspace', 'domain'].includes(limit.scope) || !Number.isSafeInteger(limit.max) || limit.max <= 0 || !Number.isSafeInteger(limit.windowMs) || limit.windowMs <= 0) {
    throw new Error('invalid email rate limit')
  }
}

function rate(limit: EmailRateLimit): number {
  return limit.max / limit.windowMs
}

/** Selects the limit with the lowest allowed message rate. */
export function selectTightestEmailRateLimit(limits: readonly EmailRateLimit[]): EmailRateLimit {
  if (limits.length === 0) throw new Error('at least one email rate limit is required')
  limits.forEach(validateLimit)
  return [...limits].sort((a, b) => rate(a) - rate(b))[0]
}

/** Evaluates all dimensions without mutating usage; callers defer instead of dropping work. */
export function evaluateEmailRateLimits(
  limits: readonly EmailRateLimit[],
  usage: readonly EmailRateUsage[],
  nowMs: number,
): EmailRateDecision {
  const tightest = selectTightestEmailRateLimit(limits)
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new Error('invalid email rate clock')
  usage.forEach(item => {
    if (!limits.some(limit => limit.scope === item.scope) || !Number.isSafeInteger(item.count) || item.count < 0 || !Number.isSafeInteger(item.windowStartedAt) || item.windowStartedAt < 0) {
      throw new Error('invalid email rate usage')
    }
  })

  const currentUsage = (limit: EmailRateLimit): { count: number; retryAt: number | null } => {
    const matching = usage.find(item => item.scope === limit.scope)
    if (!matching) return { count: 0, retryAt: null }
    const resetAt = matching.windowStartedAt + limit.windowMs
    if (nowMs >= resetAt) return { count: 0, retryAt: null }
    return { count: matching.count, retryAt: resetAt }
  }

  const states = limits.map(limit => ({ limit, state: currentUsage(limit) }))
  const blocked = states.filter(({ limit, state }) => state.count >= limit.max)
  if (blocked.length === 0) {
    const selected = states.find(({ limit }) => limit.scope === tightest.scope)
    return {
      status: 'allowed',
      selectedScope: tightest.scope,
      remaining: Math.max(0, tightest.max - (selected?.state.count || 0)),
      retryAt: null,
    }
  }

  const limiting = blocked.sort((a, b) => rate(a.limit) - rate(b.limit))[0]
  return {
    status: 'deferred',
    selectedScope: limiting.limit.scope,
    remaining: 0,
    retryAt: Math.max(...blocked.map(({ state }) => state.retryAt || nowMs)),
  }
}
