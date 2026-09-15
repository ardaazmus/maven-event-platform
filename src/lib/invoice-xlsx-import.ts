import { INVOICE_XLSX_COLUMNS } from '@/lib/invoice-xlsx-export'
import { validateInvoiceRecipient, type InvoiceRecipientType } from '@/lib/invoice-recipient-validation'

export const INVOICE_IMPORT_FORMAT_VERSION = 'invoice-batch-v1'
export const INVOICE_REQUIRED_COLUMNS = [...INVOICE_XLSX_COLUMNS]
export const INVOICE_OPTIONAL_COLUMNS = ['invoice_date'] as const

export type InvoiceImportSheet = {
  headers: readonly unknown[]
  rows: readonly (readonly unknown[])[]
}

export type InvoiceImportSchemaError = {
  code: 'invalid_headers' | 'duplicate_column' | 'required_column_missing' | 'unexpected_column' | 'empty_rows' | 'row_width_mismatch' | 'unsupported_version' | 'metadata_missing'
  row: number | null
  column: string | null
}

export type InvoiceImportSchemaResult =
  | {
    ok: true
    formatVersion: typeof INVOICE_IMPORT_FORMAT_VERSION
    columns: string[]
    rows: Array<Record<string, string>>
  }
  | { ok: false; errors: InvoiceImportSchemaError[] }

export type InvoiceImportRowValidationError = {
  code: string
  row: number
  column: string
}

export type InvoiceImportRowResult = {
  rowNumber: number
  status: 'valid' | 'review_required' | 'invalid'
  errors: InvoiceImportRowValidationError[]
  data?: Record<string, string>
}

export type InvoiceImportRowsResult = {
  status: 'valid' | 'review_required' | 'invalid'
  rows: InvoiceImportRowResult[]
}

function error(code: InvoiceImportSchemaError['code'], row: number | null, column: string | null): InvoiceImportSchemaError {
  return { code, row, column }
}

function cellText(value: unknown): string | null {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

/** Validates a normalized worksheet without mutating data or changing invoice state. */
export function validateInvoiceImportSchema(input: InvoiceImportSheet): InvoiceImportSchemaResult {
  if (!Array.isArray(input?.headers) || !Array.isArray(input?.rows)) return { ok: false, errors: [error('invalid_headers', null, null)] }

  const headers = input.headers.map(value => typeof value === 'string' ? value.trim() : '')
  if (headers.some(header => header.length === 0)) return { ok: false, errors: [error('invalid_headers', 1, null)] }

  const seen = new Set<string>()
  for (const header of headers) {
    if (seen.has(header)) return { ok: false, errors: [error('duplicate_column', 1, header)] }
    seen.add(header)
  }

  const requiredSet: Set<string> = new Set(INVOICE_REQUIRED_COLUMNS)
  const acceptedSet: Set<string> = new Set([...INVOICE_REQUIRED_COLUMNS, ...INVOICE_OPTIONAL_COLUMNS])
  for (const required of INVOICE_REQUIRED_COLUMNS) {
    if (!seen.has(required)) return { ok: false, errors: [error('required_column_missing', null, required)] }
  }
  const unexpected = headers.find(header => !acceptedSet.has(header))
  if (unexpected) return { ok: false, errors: [error('unexpected_column', 1, unexpected)] }
  if (input.rows.length === 0) return { ok: false, errors: [error('empty_rows', null, null)] }

  const rows: Array<Record<string, string>> = []
  for (const [index, sourceRow] of input.rows.entries()) {
    const spreadsheetRow = index + 2
    if (!Array.isArray(sourceRow) || sourceRow.length !== headers.length) return { ok: false, errors: [error('row_width_mismatch', spreadsheetRow, null)] }
    const values = sourceRow.map(cellText)
    if (values.some(value => value === null)) return { ok: false, errors: [error('row_width_mismatch', spreadsheetRow, null)] }
    const row = Object.fromEntries(headers.map((header, columnIndex) => [header, values[columnIndex] as string]))
    if (row.format_version !== INVOICE_IMPORT_FORMAT_VERSION) return { ok: false, errors: [error('unsupported_version', spreadsheetRow, 'format_version')] }
    for (const metadataColumn of ['batch_id', 'row_id', 'payment_reference']) {
      if (!row[metadataColumn]) return { ok: false, errors: [error('metadata_missing', spreadsheetRow, metadataColumn)] }
    }
    rows.push(row)
  }

  return { ok: true, formatVersion: INVOICE_IMPORT_FORMAT_VERSION, columns: [...headers], rows }
}

/** Explicit alias for callers that treat this step as parsing normalized cells. */
export const parseInvoiceImportSchema = validateInvoiceImportSchema

function rowError(code: string, row: number, column: string): InvoiceImportRowValidationError {
  return { code, row, column }
}

function safeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function safeMinor(value: string): number | null {
  if (!/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function validateImportRow(row: Record<string, string>, rowNumber: number): InvoiceImportRowResult {
  const errors: InvoiceImportRowValidationError[] = []
  let reviewRequired = false
  const amount = safeMinor(safeText(row.amount_minor))
  if (amount === null || amount === 0) errors.push(rowError('amount_minor_invalid', rowNumber, 'amount_minor'))

  const taxAmount = safeText(row.tax_amount_minor)
  if (taxAmount && safeMinor(taxAmount) === null) errors.push(rowError('tax_amount_minor_invalid', rowNumber, 'tax_amount_minor'))
  const taxRate = safeText(row.tax_rate_bps)
  if (taxRate && (safeMinor(taxRate) === null || Number(taxRate) > 100000)) errors.push(rowError('tax_rate_bps_invalid', rowNumber, 'tax_rate_bps'))

  const currency = safeText(row.currency)
  if (!/^[A-Z]{3}$/.test(currency)) errors.push(rowError('currency_invalid', rowNumber, 'currency'))

  const invoiceDate = safeText(row.invoice_date)
  if (!invoiceDate || !validDate(invoiceDate)) errors.push(rowError('invoice_date_invalid', rowNumber, 'invoice_date'))

  const invoiceNumber = safeText(row.invoice_number)
  const invoiceUuid = safeText(row.invoice_uuid)
  if (!invoiceNumber && !invoiceUuid) errors.push(rowError('invoice_identity_missing', rowNumber, 'invoice_number'))
  if (invoiceNumber && (invoiceNumber.length > 100 || /[\u0000-\u001F\u007F]/.test(invoiceNumber))) errors.push(rowError('invoice_number_invalid', rowNumber, 'invoice_number'))
  if (invoiceUuid && !validUuid(invoiceUuid)) errors.push(rowError('invoice_uuid_invalid', rowNumber, 'invoice_uuid'))

  const recipientType = safeText(row.recipient_type)
  if (!['individual', 'company', 'foreign'].includes(recipientType)) {
    errors.push(rowError('recipient_type_invalid', rowNumber, 'recipient_type'))
  } else {
    const recipient = validateInvoiceRecipient({
      recipientType: recipientType as InvoiceRecipientType,
      legalName: safeText(row.legal_name),
      countryCode: safeText(row.country_code),
      email: safeText(row.email),
      taxNumber: safeText(row.tax_number),
      identityNumber: safeText(row.identity_number),
      taxOffice: safeText(row.tax_office),
    })
    errors.push(...recipient.codes.map(code => rowError(code, rowNumber, code.startsWith('identity_number') ? 'identity_number' : code.startsWith('tax_number') ? 'tax_number' : code.startsWith('tax_office') ? 'tax_office' : code.startsWith('email') ? 'email' : code.startsWith('country_code') ? 'country_code' : 'legal_name')))
    if (recipient.status === 'review_required') {
      reviewRequired = true
      errors.push(rowError('recipient_review_required', rowNumber, 'recipient_type'))
    }
  }

  const invalid = errors.some(item => !item.code.endsWith('_review_required') && item.code !== 'recipient_review_required')
  if (invalid) return { rowNumber, status: 'invalid', errors }
  if (reviewRequired) return { rowNumber, status: 'review_required', errors }
  return { rowNumber, status: 'valid', errors: [], data: { ...row } }
}

/** Validates fiscal row values without echoing sensitive values in errors. */
export function validateInvoiceImportRows(input: { columns: readonly string[]; rows: readonly Record<string, string>[] }): InvoiceImportRowsResult {
  const rows = input.rows.map((row, index) => validateImportRow(row, index + 2))
  return { status: rows.some(row => row.status === 'invalid') ? 'invalid' : rows.some(row => row.status === 'review_required') ? 'review_required' : 'valid', rows }
}
