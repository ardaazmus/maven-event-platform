const PARASUT_PRODUCTS_URL = 'https://api.parasut.com/v4'
const MAX_TEXT_LENGTH = 240

export type ParasutProductLookupInput = {
  productCode?: string
  name?: string
  page?: number
  pageSize?: number
}

export type ParasutProductCreateInput = {
  productCode?: string
  name: string
  unit?: string
  vatRate?: number
  listPrice?: number
  currency?: string
  inventoryTracking?: boolean
}

export type ParasutProductCandidate = {
  providerProductId: string
  code: string | null
  name: string | null
  unit: string | null
}

export type ParasutProductResolution =
  | { status: 'matched'; providerProductId: string; matchStrategy: 'exact_code'; requiresReview: false; requiresExplicitApproval: false }
  | { status: 'create_required'; requiresReview: true; requiresExplicitApproval: true }
  | { status: 'manual_review_required'; requiresReview: true; requiresExplicitApproval: false }

type JsonObject = Record<string, unknown>

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

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

function numberValue(value: unknown, field: string): number | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1_000_000_000) throw new Error(`${field} is invalid`)
  return value
}

function companyId(value: string): void {
  if (!/^\d+$/.test(value)) throw new Error('company id must be numeric')
}

function accessToken(value: string): Record<string, string> {
  if (!value || value.length > 4_096) throw new Error('access token is invalid')
  return { Authorization: `Bearer ${value}`, Accept: 'application/vnd.api+json' }
}

function addFilter(params: URLSearchParams, key: string, value: unknown): void {
  const normalized = text(value, key)
  if (normalized) params.set(`filter[${key}]`, normalized)
}

function pagination(input: { page?: number; pageSize?: number }): { page: number; pageSize: number } {
  const page = input.page ?? 1
  const pageSize = input.pageSize ?? 25
  if (!Number.isInteger(page) || page < 1 || page > 100_000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 25) throw new Error('product lookup pagination is invalid')
  return { page, pageSize }
}

export function buildParasutProductLookupRequest(company: string, token: string, input: ParasutProductLookupInput): { url: string; method: 'GET'; headers: Record<string, string> } {
  companyId(company)
  if (![input.productCode, input.name].some(Boolean)) throw new Error('at least one product lookup filter is required')
  const params = new URLSearchParams()
  addFilter(params, 'code', input.productCode)
  addFilter(params, 'name', input.name)
  const { page, pageSize } = pagination(input)
  params.set('sort', 'id')
  params.set('page[number]', String(page))
  params.set('page[size]', String(pageSize))
  return { url: `${PARASUT_PRODUCTS_URL}/${company}/products?${params.toString()}`, method: 'GET', headers: accessToken(token) }
}

export function buildParasutProductCreateRequest(company: string, token: string, input: ParasutProductCreateInput): { url: string; method: 'POST'; headers: Record<string, string>; body: string } {
  companyId(company)
  const name = text(input.name, 'name', true)
  const attributes: Record<string, string | number | boolean> = { name: name as string }
  const code = text(input.productCode, 'productCode')
  const unit = text(input.unit, 'unit')
  const currency = text(input.currency, 'currency')
  const vatRate = numberValue(input.vatRate, 'vatRate')
  const listPrice = numberValue(input.listPrice, 'listPrice')
  if (code) attributes.code = code
  if (unit) attributes.unit = unit
  if (currency) attributes.currency = currency
  if (vatRate !== null) attributes.vat_rate = vatRate
  if (listPrice !== null) attributes.list_price = listPrice
  if (input.inventoryTracking !== undefined) attributes.inventory_tracking = input.inventoryTracking
  return {
    url: `${PARASUT_PRODUCTS_URL}/${company}/products`,
    method: 'POST',
    headers: { ...accessToken(token), 'Content-Type': 'application/vnd.api+json' },
    body: JSON.stringify({ data: { type: 'products', attributes } }),
  }
}

function safeProductCandidate(item: unknown): ParasutProductCandidate | null {
  if (!isObject(item) || item.type !== 'products' || typeof item.id !== 'string' || !/^\d+$/.test(item.id)) return null
  const attributes = isObject(item.attributes) ? item.attributes : {}
  return {
    providerProductId: item.id,
    code: text(attributes.code, 'code'),
    name: text(attributes.name, 'name'),
    unit: text(attributes.unit, 'unit'),
  }
}

export function parseParasutProductCandidates(value: unknown): ParasutProductCandidate[] {
  if (!isObject(value) || !Array.isArray(value.data)) return []
  const result: ParasutProductCandidate[] = []
  const seen = new Set<string>()
  for (const item of value.data) {
    const candidate = safeProductCandidate(item)
    if (!candidate || seen.has(candidate.providerProductId)) continue
    seen.add(candidate.providerProductId)
    result.push(candidate)
  }
  return result
}

/** Returns only the numeric id from a successful JSON:API product response. */
export function parseParasutCreatedProductId(value: unknown): string | null {
  if (!isObject(value) || !isObject(value.data) || value.data.type !== 'products' || typeof value.data.id !== 'string' || !/^\d+$/.test(value.data.id)) return null
  return value.data.id
}

function normalized(value: string | null | undefined): string | null {
  return value?.trim().toLowerCase() || null
}

export function resolveParasutProduct(input: { candidates: readonly ParasutProductCandidate[]; query: { productCode?: string; name?: string } }): ParasutProductResolution {
  const productCode = normalized(input.query.productCode)
  const name = normalized(input.query.name)
  const exactCode = productCode ? input.candidates.filter(candidate => normalized(candidate.code) === productCode) : []
  if (exactCode.length === 1) return { status: 'matched', providerProductId: exactCode[0].providerProductId, matchStrategy: 'exact_code', requiresReview: false, requiresExplicitApproval: false }
  if (exactCode.length > 1) return { status: 'manual_review_required', requiresReview: true, requiresExplicitApproval: false }
  const exactName = name ? input.candidates.filter(candidate => normalized(candidate.name) === name) : []
  if (exactName.length > 0 || input.candidates.length > 0) return { status: 'manual_review_required', requiresReview: true, requiresExplicitApproval: false }
  if (name) return { status: 'create_required', requiresReview: true, requiresExplicitApproval: true }
  return { status: 'manual_review_required', requiresReview: true, requiresExplicitApproval: false }
}

export const parasutProductAdapter = { buildParasutProductLookupRequest, buildParasutProductCreateRequest, parseParasutProductCandidates, parseParasutCreatedProductId, resolveParasutProduct } as const
