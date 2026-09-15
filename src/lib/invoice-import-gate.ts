export const requiredInvoiceImportPhases = ['I-00', 'I-01', 'I-02', 'I-03', 'I-04', 'I-05'] as const
type RequiredInvoiceImportPhase = (typeof requiredInvoiceImportPhases)[number]
type PhaseStatus = 'pass' | 'blocked' | 'unverified'

export type InvoiceImportGateResult =
  | { enabled: true; reason: 'ready'; requiredPhases: RequiredInvoiceImportPhase[] }
  | { enabled: false; reason: 'history_incomplete' | 'preview_blocked'; requiredPhases: RequiredInvoiceImportPhase[] }

function hasCompleteHistory(statuses: unknown): statuses is Record<RequiredInvoiceImportPhase, PhaseStatus> {
  if (!statuses || typeof statuses !== 'object' || Array.isArray(statuses)) return false
  const keys = Object.keys(statuses)
  if (keys.length !== requiredInvoiceImportPhases.length || keys.some(key => !requiredInvoiceImportPhases.includes(key as RequiredInvoiceImportPhase))) return false
  return requiredInvoiceImportPhases.every(phase => statuses[phase] === 'pass')
}

/**
 * Controls only the presentation gate for the import Apply action. The apply
 * service still rechecks approval, preview and idempotency server-side.
 */
export function evaluateInvoiceImportGate(input: {
  phaseStatuses: Record<string, unknown>
  previewCanApply: boolean
}): InvoiceImportGateResult {
  const requiredPhases = [...requiredInvoiceImportPhases]
  if (!hasCompleteHistory(input?.phaseStatuses)) return { enabled: false, reason: 'history_incomplete', requiredPhases }
  if (input.previewCanApply !== true) return { enabled: false, reason: 'preview_blocked', requiredPhases }
  return { enabled: true, reason: 'ready', requiredPhases }
}
