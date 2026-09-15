import { createHash } from 'node:crypto'
import { createXlsx } from '@/lib/xlsx-export'

const INVOICE_XLSX_FORMAT_VERSION = 'invoice-batch-v1'
const MAX_METADATA_ROWS = 10000

type InvoiceMetadataRowInput = {
  rowNumber: number
  paymentOrderIdSnapshot: string
}

type InvoiceXlsxMetadataInput = {
  workspaceId: string
  batchId: string
  rows: readonly InvoiceMetadataRowInput[]
}

export type InvoiceXlsxMetadata = {
  formatVersion: typeof INVOICE_XLSX_FORMAT_VERSION
  batchId: string
  rows: Array<{
    rowId: string
    paymentReference: string
  }>
}

export const INVOICE_XLSX_COLUMNS = [
  'format_version', 'batch_id', 'row_id', 'payment_reference', 'provider', 'document_type',
  'recipient_type', 'legal_name', 'country_code', 'email', 'tax_number', 'identity_number',
  'tax_office', 'billing_address', 'amount_minor', 'tax_amount_minor', 'tax_rate_bps',
  'currency', 'invoice_number', 'invoice_uuid',
] as const

export type InvoiceInterchangeInput = {
  formatVersion: string
  batchId: string
  rowId: string
  paymentReference: string
  invoice: {
    provider: string
    documentType: string
    amountMinor: number
    currency: string
    taxAmountMinor?: number | null
    taxRateBps?: number | null
    invoiceNumber?: string | null
    invoiceUuid?: string | null
    recipient?: {
      recipientType?: string | null
      legalName?: string | null
      countryCode?: string | null
      email?: string | null
      taxNumber?: string | null
      identityNumber?: string | null
      taxOffice?: string | null
      billingAddress?: string | null
    } | null
  }
}

function boundedIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 255 && !/[\u0000-\u001F\u007F]/.test(value)
}

function opaqueHash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function invalidMetadata(): never {
  throw new Error('metadata_invalid')
}

/** Produces non-PII metadata required to correlate a later accounting import. */
export function buildInvoiceXlsxMetadata(input: InvoiceXlsxMetadataInput): InvoiceXlsxMetadata {
  if (!boundedIdentifier(input?.workspaceId) || !boundedIdentifier(input?.batchId) || !Array.isArray(input?.rows) || input.rows.length > MAX_METADATA_ROWS) invalidMetadata()

  const rowNumbers = new Set<number>()
  const paymentOrderIds = new Set<string>()
  const rows = input.rows.map(row => {
    if (!Number.isSafeInteger(row?.rowNumber) || row.rowNumber <= 0 || row.rowNumber > MAX_METADATA_ROWS || !boundedIdentifier(row?.paymentOrderIdSnapshot)) invalidMetadata()
    if (rowNumbers.has(row.rowNumber) || paymentOrderIds.has(row.paymentOrderIdSnapshot)) invalidMetadata()
    rowNumbers.add(row.rowNumber)
    paymentOrderIds.add(row.paymentOrderIdSnapshot)
    return {
      rowId: `row_${opaqueHash(`${input.batchId}\u001f${row.rowNumber}\u001f${row.paymentOrderIdSnapshot}`)}`,
      paymentReference: `payref_${opaqueHash(`${input.workspaceId}\u001f${row.paymentOrderIdSnapshot}`)}`,
    }
  })

  return { formatVersion: INVOICE_XLSX_FORMAT_VERSION, batchId: input.batchId, rows }
}

/** Creates a single visible, metadata-only workbook with no formula surface. */
export function createInvoiceMetadataXlsx(input: InvoiceXlsxMetadataInput): Buffer {
  const metadata = buildInvoiceXlsxMetadata(input)
  return createXlsx(
    ['format_version', 'batch_id', 'row_id', 'payment_reference'],
    metadata.rows.map((row, index) => [metadata.formatVersion, metadata.batchId, row.rowId, row.paymentReference]),
  )
}

/** Creates the fixed-column workbook used for repeatable manual export replay. */
export function createInvoiceInterchangeXlsx(rows: readonly (readonly string[])[]): Buffer {
  if (!Array.isArray(rows) || rows.length > MAX_METADATA_ROWS || rows.some(row => !Array.isArray(row) || row.length !== INVOICE_XLSX_COLUMNS.length || row.some(value => typeof value !== 'string'))) {
    throw new Error('invoice_workbook_invalid')
  }
  return createXlsx([...INVOICE_XLSX_COLUMNS], rows.map(row => [...row]))
}

function spreadsheetText(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value).replace(/[\u0000-\u001F\u007F]/g, '')
  return /^[=+\-@]/.test(text) ? `'${text}` : text
}

function boundedSpreadsheetText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 255 && !/[\u0000-\u001F\u007F]/.test(value)
}

function nonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/**
 * Maps only the verified invoice snapshot and explicitly decrypted recipient
 * object into a stable accounting interchange row. Client/form amounts are
 * intentionally not part of this input contract.
 */
export function mapInvoiceInterchangeRow(input: InvoiceInterchangeInput): string[] {
  const invoice = input?.invoice
  if (!boundedSpreadsheetText(input?.formatVersion)
    || !boundedSpreadsheetText(input?.batchId)
    || !boundedSpreadsheetText(input?.rowId)
    || !boundedSpreadsheetText(input?.paymentReference)
    || input.formatVersion !== INVOICE_XLSX_FORMAT_VERSION
    || !boundedSpreadsheetText(invoice?.provider)
    || !boundedSpreadsheetText(invoice?.documentType)
    || !nonNegativeSafeInteger(invoice?.amountMinor)
    || invoice.amountMinor === 0
    || typeof invoice.currency !== 'string'
    || !/^[A-Z]{3}$/.test(invoice.currency)
    || (invoice.taxAmountMinor !== null && invoice.taxAmountMinor !== undefined && !nonNegativeSafeInteger(invoice.taxAmountMinor))
    || (invoice.taxRateBps !== null && invoice.taxRateBps !== undefined && !nonNegativeSafeInteger(invoice.taxRateBps))) {
    throw new Error('invoice_row_invalid')
  }

  const recipient = invoice.recipient ?? {}
  return [
    spreadsheetText(input.formatVersion),
    spreadsheetText(input.batchId),
    spreadsheetText(input.rowId),
    spreadsheetText(input.paymentReference),
    spreadsheetText(invoice.provider),
    spreadsheetText(invoice.documentType),
    spreadsheetText(recipient.recipientType),
    spreadsheetText(recipient.legalName),
    spreadsheetText(recipient.countryCode),
    spreadsheetText(recipient.email),
    spreadsheetText(recipient.taxNumber),
    spreadsheetText(recipient.identityNumber),
    spreadsheetText(recipient.taxOffice),
    spreadsheetText(recipient.billingAddress),
    spreadsheetText(invoice.amountMinor),
    spreadsheetText(invoice.taxAmountMinor),
    spreadsheetText(invoice.taxRateBps),
    spreadsheetText(invoice.currency),
    spreadsheetText(invoice.invoiceNumber),
    spreadsheetText(invoice.invoiceUuid),
  ]
}
