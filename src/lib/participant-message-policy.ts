export type ParticipantMessageKind = 'welcome' | 'payment_pending'

export type ParticipantMessageInput = {
  kind: unknown
  workspaceId: unknown
  formId: unknown
  submissionId: unknown
  formTitle: unknown
  registrationLabel: unknown
  recipient: { email: unknown; source: unknown }
  paymentInstruction?: unknown
  paymentInstructionSource?: unknown
}

export type ParticipantMessageResult =
  | {
      status: 'ready'
      messageClass: 'notification'
      eventKind: 'admin_notification'
      template: 'participant_welcome' | 'payment_pending'
      idempotencyKey: string
      recipientEmail: string
      subject: string
      textBody: string
    }
  | { status: 'deny'; reason: 'input_invalid' | 'recipient_not_server_derived' | 'payment_instruction_not_authorized' }

const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

function normalizeText(value: unknown, maximumLength: number): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized || normalized.length > maximumLength || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(normalized)) return null
  return normalized
}

function isParticipantMessageKind(value: unknown): value is ParticipantMessageKind {
  return value === 'welcome' || value === 'payment_pending'
}

/** Builds a non-marketing participant notification from server-derived context. */
export function buildParticipantMessage(input: ParticipantMessageInput): ParticipantMessageResult {
  const workspaceId = normalizeText(input.workspaceId, 120)
  const formId = normalizeText(input.formId, 120)
  const submissionId = normalizeText(input.submissionId, 120)
  const formTitle = normalizeText(input.formTitle, 160)
  const registrationLabel = normalizeText(input.registrationLabel, 120)

  if (!workspaceId || !formId || !submissionId || !formTitle || !registrationLabel || !isParticipantMessageKind(input.kind)) {
    return { status: 'deny', reason: 'input_invalid' }
  }

  if (
    !input.recipient ||
    input.recipient.source !== 'server_snapshot' ||
    typeof input.recipient.email !== 'string' ||
    !emailPattern.test(input.recipient.email.trim())
  ) {
    return { status: 'deny', reason: 'recipient_not_server_derived' }
  }

  const recipientEmail = input.recipient.email.trim().toLowerCase()
  const idempotencyKey = `participant:${submissionId}:${input.kind}:v1`

  if (input.kind === 'welcome') {
    return {
      status: 'ready',
      messageClass: 'notification',
      eventKind: 'admin_notification',
      template: 'participant_welcome',
      idempotencyKey,
      recipientEmail,
      subject: `Kaydınız alındı: ${formTitle}`,
      textBody: `Merhaba,\n\n${formTitle} formundaki kaydınız alınmıştır.\nKayıt türü: ${registrationLabel}\n\nHoş geldiniz.`,
    }
  }

  if (input.paymentInstructionSource !== 'authorized_message_setting') {
    return { status: 'deny', reason: 'payment_instruction_not_authorized' }
  }

  const paymentInstruction = normalizeText(input.paymentInstruction, 2000)
  if (!paymentInstruction) return { status: 'deny', reason: 'input_invalid' }

  return {
    status: 'ready',
    messageClass: 'notification',
    eventKind: 'admin_notification',
    template: 'payment_pending',
    idempotencyKey,
    recipientEmail,
    subject: `Ödeme bilgisi: ${formTitle}`,
    textBody: `Merhaba,\n\n${formTitle} kaydınız alınmıştır.\nKayıt türü: ${registrationLabel}\n\nÖdeme durumu: Ödeme bekleniyor.\n${paymentInstruction}`,
  }
}
