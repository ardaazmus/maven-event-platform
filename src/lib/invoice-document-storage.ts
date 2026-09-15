import path from 'node:path'

export const INVOICE_DOCUMENT_ROOT = process.env.INVOICE_DOCUMENT_ROOT || 'storage/invoice-documents'

function safeIdentifier(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,255}$/.test(value)
}

function safeExtension(value: string): value is 'pdf' | 'xml' | 'xlsx' {
  return value === 'pdf' || value === 'xml' || value === 'xlsx'
}

/** Returns a private, invoice-scoped quarantine key; it is never a public URL. */
export function invoiceDocumentStoragePath(workspaceId: string, invoiceId: string, documentId: string, extension: string): string {
  if (!safeIdentifier(workspaceId) || !safeIdentifier(invoiceId) || !safeIdentifier(documentId) || !safeExtension(extension)) throw new Error('invalid_invoice_document_identifier')
  return path.join(INVOICE_DOCUMENT_ROOT, 'workspaces', workspaceId, 'invoices', invoiceId, 'quarantine', `${documentId}.${extension}`).split(path.sep).join('/')
}
