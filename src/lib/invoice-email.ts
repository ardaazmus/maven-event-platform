import { buildTransactionalEmail, type TransactionalEmail } from '@/lib/email-template-policy'

const recipientEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type InvoiceReadyEmailInput = {
  recipientEmail: string
  formTitle: string
  invoiceNumber?: string | null
  invoiceState: string
  documentReadyState?: string
  scanStatus: string
  documentUrl: string
  appOrigin: string
}

export type InvoiceReadyEmail = {
  recipientEmail: string
  email: TransactionalEmail & { messageClass: 'transactional' }
}

function normalizeRecipientEmail(value: unknown): string {
  if (typeof value !== 'string') throw new Error('recipient email invalid')
  const email = value.trim().toLowerCase()
  if (email.length > 320 || !recipientEmailPattern.test(email)) throw new Error('recipient email invalid')
  return email
}

function normalizeTemplateText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') throw new Error(`${field} invalid`)
  const text = value.trim()
  if (!text || text.length > maxLength || text.includes('\r') || text.includes('\n')) throw new Error(`${field} invalid`)
  return text
}

/** Builds the only invoice-ready email variant allowed by the document workflow. */
export function buildInvoiceReadyEmail(input: InvoiceReadyEmailInput): InvoiceReadyEmail {
  if (input.invoiceState !== 'document_ready' && input.documentReadyState !== 'verified') throw new Error('document_ready required')
  if (input.scanStatus !== 'clean') throw new Error('clean scan required')

  const recipientEmail = normalizeRecipientEmail(input.recipientEmail)
  const formTitle = normalizeTemplateText(input.formTitle, 'form title', 200)
  const invoiceNumber = input.invoiceNumber == null
    ? null
    : normalizeTemplateText(input.invoiceNumber, 'invoice number', 100)
  const subject = invoiceNumber ? `Faturanız hazır: ${invoiceNumber}` : 'Faturanız hazır'
  const textBody = `${formTitle} için faturanız hazır.\nBelgenizi güvenli bağlantıdan görüntüleyebilirsiniz.`
  const email = buildTransactionalEmail({
    messageClass: 'transactional',
    subject,
    textBody,
    documentUrl: input.documentUrl,
    appOrigin: input.appOrigin,
  })

  return {
    recipientEmail,
    email: { messageClass: 'transactional', ...email },
  }
}
