export const requiredInvoiceDocumentPhases = ['U-00', 'U-01', 'U-02', 'U-03', 'U-04'] as const

export type InvoiceDocumentUploadGateResult =
  | { enabled: true; canDownload: true; canDeliver: true }
  | { enabled: false; canDownload: false; canDeliver: false; reason: 'phase_gate' | 'document_not_ready' }

/** Combines the document security and matching gates before release/delivery UI. */
export function evaluateInvoiceDocumentUploadGate(input: {
  phaseStatuses: Readonly<Record<string, unknown>>
  documentReadyAllowed: boolean
}): InvoiceDocumentUploadGateResult {
  const statuses = input?.phaseStatuses
  const phasesPassed = statuses !== null
    && typeof statuses === 'object'
    && Object.keys(statuses).length === requiredInvoiceDocumentPhases.length
    && requiredInvoiceDocumentPhases.every(phase => statuses[phase] === 'pass')
  if (!phasesPassed) return { enabled: false, canDownload: false, canDeliver: false, reason: 'phase_gate' }
  if (input.documentReadyAllowed !== true) return { enabled: false, canDownload: false, canDeliver: false, reason: 'document_not_ready' }
  return { enabled: true, canDownload: true, canDeliver: true }
}
