import { evaluateInvoiceDocumentUploadGate } from '@/lib/invoice-document-upload-gate'

export const requiredInvoiceEmailPhases = ['E-00', 'E-01', 'E-02', 'E-03'] as const

type InvoiceEmailGateFailure =
  | 'email_phase_gate'
  | 'document_phase_gate'
  | 'document_not_ready'
  | 'message_class_invalid'
  | 'recipient_missing'
  | 'recipient_suppressed'
  | 'delivery_not_queued'
  | 'outbox_not_dispatchable'

export type InvoiceEmailGateResult =
  | { enabled: true; canDeliver: true }
  | { enabled: false; canDeliver: false; reason: InvoiceEmailGateFailure }

function hasCompleteEmailHistory(statuses: unknown): boolean {
  if (!statuses || typeof statuses !== 'object' || Array.isArray(statuses)) return false
  const keys = Object.keys(statuses)
  return keys.length === requiredInvoiceEmailPhases.length
    && requiredInvoiceEmailPhases.every(phase => (statuses as Record<string, unknown>)[phase] === 'pass')
}

/** Combines every invoice document and transactional email gate before delivery. */
export function evaluateInvoiceEmailGate(input: {
  emailPhaseStatuses: Readonly<Record<string, unknown>>
  documentPhaseStatuses: Readonly<Record<string, unknown>>
  documentReadyAllowed: boolean
  messageClass: string
  recipientPresent: boolean
  suppressed: boolean
  deliveryIntentStatus: string
  outboxStatus: string
}): InvoiceEmailGateResult {
  if (!hasCompleteEmailHistory(input?.emailPhaseStatuses)) return { enabled: false, canDeliver: false, reason: 'email_phase_gate' }
  const documentGate = evaluateInvoiceDocumentUploadGate({
    phaseStatuses: input?.documentPhaseStatuses,
    documentReadyAllowed: input?.documentReadyAllowed,
  })
  if (!documentGate.enabled) return { enabled: false, canDeliver: false, reason: documentGate.reason === 'document_not_ready' ? 'document_not_ready' : 'document_phase_gate' }
  if (input.messageClass !== 'transactional') return { enabled: false, canDeliver: false, reason: 'message_class_invalid' }
  if (input.recipientPresent !== true) return { enabled: false, canDeliver: false, reason: 'recipient_missing' }
  if (input.suppressed === true) return { enabled: false, canDeliver: false, reason: 'recipient_suppressed' }
  if (!['queued', 'sending'].includes(input.deliveryIntentStatus)) return { enabled: false, canDeliver: false, reason: 'delivery_not_queued' }
  if (!['queued', 'sending'].includes(input.outboxStatus)) return { enabled: false, canDeliver: false, reason: 'outbox_not_dispatchable' }
  return { enabled: true, canDeliver: true }
}
