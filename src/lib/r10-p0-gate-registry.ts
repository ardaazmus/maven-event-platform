export const R10_P0_GATE_IDS = Object.freeze([
  'provider_merchant',
  'webhook_reconciliation',
  'accounting_legal',
  'document_scan',
  'transactional_sender',
  'staging_backup_restore',
  'independent_review',
] as const)

export const R10_P0_EVIDENCE_STATUSES = Object.freeze(['verified', 'missing', 'expired', 'blocked', 'unverified'] as const)

export type R10P0GateId = (typeof R10_P0_GATE_IDS)[number]
export type R10P0EvidenceStatus = (typeof R10_P0_EVIDENCE_STATUSES)[number]

export type R10P0GateRegistryResult =
  | {
      ok: true
      decision: Readonly<{
        decision: 'NO_GO' | 'P0_READY_FOR_REVIEW'
        missingGateIds: readonly R10P0GateId[]
        productionMutationAllowed: false
        externalReviewRequired: true
      }>
    }
  | { ok: false; reason: 'input_invalid' | 'sensitive_metadata_not_allowed' }

function isGateId(value: unknown): value is R10P0GateId {
  return typeof value === 'string' && R10_P0_GATE_IDS.includes(value as R10P0GateId)
}

function isEvidenceStatus(value: unknown): value is R10P0EvidenceStatus {
  return typeof value === 'string' && R10_P0_EVIDENCE_STATUSES.includes(value as R10P0EvidenceStatus)
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).every(key => keys.includes(key))
}

/** Evaluates the R-10 P0 registry without opening release or provider mutation. */
export function evaluateR10P0GateRegistry(input: unknown): R10P0GateRegistryResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, reason: 'input_invalid' }
  const value = input as Record<string, unknown>
  if (!hasOnlyKeys(value, ['target', 'gates'])) return { ok: false, reason: 'sensitive_metadata_not_allowed' }
  if (value.target !== 'production' || !Array.isArray(value.gates) || value.gates.length !== R10_P0_GATE_IDS.length) return { ok: false, reason: 'input_invalid' }

  const statuses = new Map<R10P0GateId, R10P0EvidenceStatus>()
  for (const rawGate of value.gates) {
    if (!rawGate || typeof rawGate !== 'object' || Array.isArray(rawGate)) return { ok: false, reason: 'input_invalid' }
    const gate = rawGate as Record<string, unknown>
    if (!hasOnlyKeys(gate, ['id', 'status'])) return { ok: false, reason: 'sensitive_metadata_not_allowed' }
    if (!isGateId(gate.id) || !isEvidenceStatus(gate.status)) return { ok: false, reason: 'input_invalid' }
    if (statuses.has(gate.id)) return { ok: false, reason: 'input_invalid' }
    statuses.set(gate.id, gate.status)
  }

  const missingGateIds = R10_P0_GATE_IDS.filter(gateId => statuses.get(gateId) !== 'verified')
  return {
    ok: true,
    decision: Object.freeze({
      decision: missingGateIds.length === 0 ? 'P0_READY_FOR_REVIEW' : 'NO_GO',
      missingGateIds: Object.freeze(missingGateIds),
      productionMutationAllowed: false,
      externalReviewRequired: true,
    }),
  }
}
