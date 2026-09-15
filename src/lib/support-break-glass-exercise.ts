export const BREAK_GLASS_ACCESS_STATES = Object.freeze(['requested', 'active', 'expired', 'revoked'] as const)
export const BREAK_GLASS_INCIDENT_MODES = Object.freeze(['normal', 'suspected_breach'] as const)
export const BREAK_GLASS_MAX_TTL_MS = 60 * 60 * 1000

export type BreakGlassAccessState = (typeof BREAK_GLASS_ACCESS_STATES)[number]
export type BreakGlassIncidentMode = (typeof BREAK_GLASS_INCIDENT_MODES)[number]

export type BreakGlassExerciseResult =
  | {
      ok: true
      decision: Readonly<{
        action: 'issue' | 'allow' | 'revoke' | 'expire'
        state: 'active' | 'revoked' | 'expired'
        scope: 'tenant'
        mode: 'read_only'
        terminal: boolean
        auditRequired: true
      }>
    }
  | {
      ok: false
      reason:
        | 'input_invalid'
        | 'tenant_scope_mismatch'
        | 'policy_denied'
        | 'ticket_required'
        | 'purpose_required'
        | 'mfa_required'
        | 'step_up_required'
        | 'read_only_required'
        | 'mutation_not_allowed'
        | 'ttl_invalid'
        | 'already_expired'
        | 'already_revoked'
    }

function safeIdentifier(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/u.test(value)
}

function safeText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length >= 3 && value.length <= max && !/[\r\n]/u.test(value)
}

function safeTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function decision(action: 'issue' | 'allow' | 'revoke' | 'expire', state: 'active' | 'revoked' | 'expired', terminal: boolean): BreakGlassExerciseResult {
  return { ok: true, decision: { action, state, scope: 'tenant', mode: 'read_only', terminal, auditRequired: true } }
}

/** Evaluates break-glass lifecycle facts without issuing or revoking a real session. */
export function evaluateSupportBreakGlassExercise(input: Readonly<{
  tenantId: string
  requestedTenantId: string
  policyAllowed: boolean
  accessState: BreakGlassAccessState
  incidentMode: BreakGlassIncidentMode
  ticketReference: string | null
  purpose: string | null
  mfaVerified: boolean
  stepUpVerified: boolean
  readOnly: boolean
  mutationRequested: boolean
  approved: boolean
  revokeRequested: boolean
  nowMs: number
  expiresAtMs: number
}>): BreakGlassExerciseResult {
  if (!input || typeof input !== 'object') return { ok: false, reason: 'input_invalid' }
  if (!safeIdentifier(input.tenantId) || !safeIdentifier(input.requestedTenantId) || !BREAK_GLASS_ACCESS_STATES.includes(input.accessState) || !BREAK_GLASS_INCIDENT_MODES.includes(input.incidentMode)) return { ok: false, reason: 'input_invalid' }
  if (!safeTime(input.nowMs) || !safeTime(input.expiresAtMs) || input.expiresAtMs < input.nowMs - BREAK_GLASS_MAX_TTL_MS) return { ok: false, reason: 'ttl_invalid' }
  if (input.tenantId !== input.requestedTenantId) return { ok: false, reason: 'tenant_scope_mismatch' }
  if (input.policyAllowed !== true || input.approved !== true) return { ok: false, reason: 'policy_denied' }
  if (!safeText(input.ticketReference, 120)) return { ok: false, reason: 'ticket_required' }
  if (!safeText(input.purpose, 240)) return { ok: false, reason: 'purpose_required' }
  if (input.mfaVerified !== true) return { ok: false, reason: 'mfa_required' }
  if (input.stepUpVerified !== true) return { ok: false, reason: 'step_up_required' }
  if (input.readOnly !== true) return { ok: false, reason: 'read_only_required' }
  if (input.mutationRequested === true) return { ok: false, reason: 'mutation_not_allowed' }
  if (input.accessState === 'revoked') return { ok: false, reason: 'already_revoked' }
  if (input.accessState === 'expired') return { ok: false, reason: 'already_expired' }
  if (input.incidentMode === 'suspected_breach' || input.revokeRequested === true) return decision('revoke', 'revoked', true)
  if (input.expiresAtMs <= input.nowMs) return input.accessState === 'active' ? decision('expire', 'expired', true) : { ok: false, reason: 'ttl_invalid' }
  if (input.expiresAtMs - input.nowMs > BREAK_GLASS_MAX_TTL_MS) return { ok: false, reason: 'ttl_invalid' }
  return input.accessState === 'requested' ? decision('issue', 'active', false) : decision('allow', 'active', false)
}
