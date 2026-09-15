import { createHash } from 'node:crypto'

const PARASUT_SALES_INVOICES_URL = 'https://api.parasut.com/v4'
const CURRENCIES = new Set(['TRL', 'USD', 'EUR', 'GBP'])
const MAX_TEXT_LENGTH = 500

export type ParasutSalesInvoiceLineSnapshot = {
  lineNumber: number
  description: string
  quantity: string
  unitPriceMinor: number
  taxRateBps: number
  taxAmountMinor?: number | null
  discountAmountMinor?: number | null
  lineTotalMinor: number
  currency: string
  providerProductId: string
}

export type ParasutSalesInvoicePayloadInput = {
  workspaceId: string
  paymentOrderId: string
  paymentOrderStatus: 'succeeded' | string
  invoiceState: 'paid_ready_for_invoicing' | 'accounting_review_required' | string
  contactId: string
  lines: readonly ParasutSalesInvoiceLineSnapshot[]
  currency: string
  totalMinor: number
  issueDate: string
  dueDate?: string
  description?: string
  invoiceSeries?: string
  invoiceId?: number
  exchangeRate?: number
  isAbroad?: boolean
  orderNo?: string
  orderDate?: string
  cashSale?: boolean
  invoiceNote?: string
}

type JsonObject = Record<string, unknown>

export type ParasutSalesInvoicePayloadResult =
  | { ok: true; url: string; method: 'POST'; payload: JsonObject; requestFingerprint: string }
  | { ok: false; reason: 'payment_not_succeeded' | 'accounting_review_required' | 'invalid_contact' | 'invalid_product_mapping' | 'lines_invalid' | 'amount_mismatch' | 'currency_mismatch' | 'date_invalid' | 'foreign_exchange_rate_required' | 'order_pair_invalid' }

function text(value: unknown, field: string, required = false): string | null {
  if (typeof value !== 'string') {
    if (required) throw new Error(`${field} is required`)
    return null
  }
  const normalized = value.trim()
  if (!normalized || normalized.length > MAX_TEXT_LENGTH || /[\r\n]/.test(normalized)) {
    if (required) throw new Error(`${field} is invalid`)
    return null
  }
  return normalized
}

function numericId(value: string): boolean {
  return /^\d+$/.test(value) && value !== '0'
}

function safeMinor(value: unknown): boolean {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function safeRate(value: unknown): boolean {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 100_000
}

function safeDate(value: unknown): boolean {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

function quantityInMicros(value: string): bigint | null {
  if (!/^\d+(?:\.\d{1,6})?$/.test(value) || Number(value) <= 0) return null
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * BigInt(1_000_000) + BigInt(fraction.padEnd(6, '0'))
}

function roundedQuantityProduct(unitPriceMinor: number, quantityMicros: bigint): number | null {
  const result = (BigInt(unitPriceMinor) * quantityMicros + BigInt(500_000)) / BigInt(1_000_000)
  return result <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(result) : null
}

function majorAmount(value: number): number {
  return Number((value / 100).toFixed(2))
}

function fingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex')
}

/** Maps immutable local snapshots to a provider draft payload; it never performs a network call. */
export function buildParasutSalesInvoicePayload(input: ParasutSalesInvoicePayloadInput): ParasutSalesInvoicePayloadResult {
  if (input.paymentOrderStatus !== 'succeeded') return { ok: false, reason: 'payment_not_succeeded' }
  if (input.invoiceState !== 'paid_ready_for_invoicing') return { ok: false, reason: 'accounting_review_required' }
  if (!input.workspaceId.trim() || !input.paymentOrderId.trim() || !numericId(input.contactId)) return { ok: false, reason: 'invalid_contact' }
  if (!CURRENCIES.has(input.currency) || !safeMinor(input.totalMinor) || input.totalMinor <= 0) return { ok: false, reason: 'currency_mismatch' }
  if (input.currency !== 'TRL' && (!input.exchangeRate || !Number.isFinite(input.exchangeRate) || input.exchangeRate <= 0)) return { ok: false, reason: 'foreign_exchange_rate_required' }
  if (!safeDate(input.issueDate) || (input.dueDate !== undefined && !safeDate(input.dueDate))) return { ok: false, reason: 'date_invalid' }
  if ((input.orderNo && !input.orderDate) || (!input.orderNo && input.orderDate)) return { ok: false, reason: 'order_pair_invalid' }
  if (input.orderDate && !safeDate(input.orderDate)) return { ok: false, reason: 'date_invalid' }
  if (input.lines.length === 0) return { ok: false, reason: 'lines_invalid' }

  const lineNumbers = new Set<number>()
  let total = 0
  const details: JsonObject[] = []
  for (const line of input.lines) {
    const description = text(line.description, 'description', true)
    const quantity = text(line.quantity, 'quantity', true)
    const quantityMicros = quantityInMicros(quantity as string)
    const taxAmountMinor = line.taxAmountMinor ?? 0
    const discountAmountMinor = line.discountAmountMinor ?? 0
    if (!description || !quantityMicros || !Number.isInteger(line.lineNumber) || line.lineNumber < 1 || lineNumbers.has(line.lineNumber) || !safeMinor(line.unitPriceMinor) || !safeRate(line.taxRateBps) || !safeMinor(taxAmountMinor) || !safeMinor(discountAmountMinor) || !safeMinor(line.lineTotalMinor)) return { ok: false, reason: 'lines_invalid' }
    if (line.currency !== input.currency || !numericId(line.providerProductId)) return { ok: false, reason: 'invalid_product_mapping' }
    const baseMinor = roundedQuantityProduct(line.unitPriceMinor, quantityMicros)
    if (baseMinor === null || baseMinor + taxAmountMinor - discountAmountMinor !== line.lineTotalMinor) return { ok: false, reason: 'amount_mismatch' }
    lineNumbers.add(line.lineNumber)
    total += line.lineTotalMinor
    if (!Number.isSafeInteger(total)) return { ok: false, reason: 'amount_mismatch' }
    const attributes: JsonObject = { quantity: Number(quantity), unit_price: majorAmount(line.unitPriceMinor), vat_rate: line.taxRateBps / 100, description }
    if (discountAmountMinor > 0) {
      attributes.discount_type = 'amount'
      attributes.discount_value = majorAmount(discountAmountMinor)
    }
    details.push({ type: 'sales_invoice_details', attributes, relationships: { product: { data: { type: 'products', id: line.providerProductId } } } })
  }
  if (total !== input.totalMinor) return { ok: false, reason: 'amount_mismatch' }

  const attributes: JsonObject = { item_type: 'invoice', issue_date: input.issueDate, currency: input.currency }
  const optionalText: Array<[string, unknown]> = [['due_date', input.dueDate], ['description', input.description], ['invoice_series', input.invoiceSeries], ['order_no', input.orderNo], ['invoice_note', input.invoiceNote]]
  for (const [key, value] of optionalText) {
    const normalized = text(value, key)
    if (normalized) attributes[key] = normalized
  }
  if (input.invoiceId !== undefined) {
    if (!Number.isSafeInteger(input.invoiceId) || input.invoiceId < 1) return { ok: false, reason: 'lines_invalid' }
    attributes.invoice_id = input.invoiceId
  }
  if (input.exchangeRate !== undefined) attributes.exchange_rate = input.exchangeRate
  if (input.isAbroad !== undefined) attributes.is_abroad = input.isAbroad
  if (input.orderDate) attributes.order_date = input.orderDate
  if (input.cashSale !== undefined) attributes.cash_sale = input.cashSale
  const payload = { data: { type: 'sales_invoices', attributes, relationships: { contact: { data: { type: 'contacts', id: input.contactId } }, details: { data: details } } } }
  return { ok: true, url: `${PARASUT_SALES_INVOICES_URL}/{{company_id}}/sales_invoices`, method: 'POST', payload, requestFingerprint: fingerprint({ version: 'parasut-sales-invoice-draft-v1', workspaceId: input.workspaceId, paymentOrderId: input.paymentOrderId, payload }) }
}
