import { createHash } from 'node:crypto'
import path from 'node:path'

export const INVOICE_IMPORT_MAX_SIZE = 10 * 1024 * 1024
export const INVOICE_IMPORT_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const ACCEPTED_DECLARED_MIMES = new Set([INVOICE_IMPORT_MIME, 'application/octet-stream', 'application/zip'])
export const INVOICE_IMPORT_ROOT = process.env.INVOICE_IMPORT_ROOT || 'storage/invoice-imports'

export type InvoiceImportUploadInput = {
  filename: string
  mime: string
  size: number
  bytes: Uint8Array
}

export type InvoiceImportValidation =
  | { ok: true; sha256: string; detectedMime: typeof INVOICE_IMPORT_MIME }
  | { ok: false; code: 'invalid_filename' | 'invalid_size' | 'invalid_mime' | 'invalid_signature' | 'size_mismatch' }

function safeIdentifier(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,255}$/.test(value)
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function isXlsxZipSignature(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
}

/** Validates an accountant workbook without parsing or trusting its contents. */
export function validateInvoiceImportUpload(input: InvoiceImportUploadInput): InvoiceImportValidation {
  const filename = typeof input?.filename === 'string' ? input.filename.trim() : ''
  const mime = typeof input?.mime === 'string' ? input.mime.toLowerCase().trim() : ''
  const bytes = input?.bytes
  if (!filename || path.basename(filename) !== filename || !/\.xlsx$/i.test(filename) || /[\u0000-\u001F\u007F]/.test(filename)) return { ok: false, code: 'invalid_filename' }
  if (!Number.isSafeInteger(input?.size) || input.size <= 0 || input.size > INVOICE_IMPORT_MAX_SIZE) return { ok: false, code: 'invalid_size' }
  if (!(bytes instanceof Uint8Array) || bytes.byteLength !== input.size) return { ok: false, code: 'size_mismatch' }
  if (!ACCEPTED_DECLARED_MIMES.has(mime)) return { ok: false, code: 'invalid_mime' }
  if (!isXlsxZipSignature(bytes)) return { ok: false, code: 'invalid_signature' }
  return { ok: true, sha256: sha256(bytes), detectedMime: INVOICE_IMPORT_MIME }
}

/** Returns a private, tenant-scoped quarantine key; it is never a public URL. */
export function invoiceImportStoragePath(workspaceId: string, uploadId: string): string {
  if (!safeIdentifier(workspaceId) || !safeIdentifier(uploadId)) throw new Error('invalid_import_identifier')
  return path.join(INVOICE_IMPORT_ROOT, 'workspaces', workspaceId, 'quarantine', `${uploadId}.xlsx`).split(path.sep).join('/')
}
