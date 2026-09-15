const PARASUT_CONTACTS_URL = 'https://api.parasut.com/v4'
const MAX_TEXT_LENGTH = 240

export type ParasutContactLookupInput = {
  taxNumber?: string
  email?: string
  name?: string
  taxOffice?: string
  city?: string
  accountType?: 'customer' | 'supplier'
  page?: number
  pageSize?: number
}

export type ParasutContactCreateInput = {
  legalName: string
  accountType: 'customer' | 'supplier'
  email?: string
  taxNumber?: string
  taxOffice?: string
  contactType?: 'person' | 'company'
}

export type ParasutContactCandidate = {
  providerContactId: string
  name: string | null
  email: string | null
  taxNumber: string | null
  accountType: 'customer' | 'supplier' | null
}

export type ParasutContactResolution =
  | { status: 'matched'; providerContactId: string; matchStrategy: 'exact_tax_number' | 'exact_email'; requiresReview: false; requiresExplicitApproval: false }
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

function email(value: unknown, required = false): string | null {
  const normalized = text(value, 'email', required)?.toLowerCase() || null
  if (normalized && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    if (required) throw new Error('email is invalid')
    return null
  }
  return normalized
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

export function buildParasutContactLookupRequest(company: string, token: string, input: ParasutContactLookupInput): { url: string; method: 'GET'; headers: Record<string, string> } {
  companyId(company)
  const params = new URLSearchParams()
  addFilter(params, 'tax_number', input.taxNumber)
  addFilter(params, 'email', email(input.email))
  addFilter(params, 'name', input.name)
  addFilter(params, 'tax_office', input.taxOffice)
  addFilter(params, 'city', input.city)
  params.set('filter[account_type]', input.accountType || 'customer')
  if (![input.taxNumber, input.email, input.name, input.taxOffice, input.city].some(Boolean)) throw new Error('at least one lookup filter is required')
  const page = input.page ?? 1
  const pageSize = input.pageSize ?? 25
  if (!Number.isInteger(page) || page < 1 || page > 100_000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 25) throw new Error('contact lookup pagination is invalid')
  params.set('sort', 'id')
  params.set('page[number]', String(page))
  params.set('page[size]', String(pageSize))
  return { url: `${PARASUT_CONTACTS_URL}/${company}/contacts?${params.toString()}`, method: 'GET', headers: accessToken(token) }
}

export function buildParasutContactCreateRequest(company: string, token: string, input: ParasutContactCreateInput): { url: string; method: 'POST'; headers: Record<string, string>; body: string } {
  companyId(company)
  const legalName = text(input.legalName, 'legalName', true)
  const attributes: Record<string, string> = { name: legalName as string, account_type: input.accountType }
  const contactEmail = email(input.email)
  const taxNumber = text(input.taxNumber, 'taxNumber')
  const taxOffice = text(input.taxOffice, 'taxOffice')
  if (contactEmail) attributes.email = contactEmail
  if (taxNumber) attributes.tax_number = taxNumber
  if (taxOffice) attributes.tax_office = taxOffice
  if (input.contactType) attributes.contact_type = input.contactType
  return {
    url: `${PARASUT_CONTACTS_URL}/${company}/contacts`,
    method: 'POST',
    headers: { ...accessToken(token), 'Content-Type': 'application/vnd.api+json' },
    body: JSON.stringify({ data: { type: 'contacts', attributes } }),
  }
}

function safeContactCandidate(item: unknown): ParasutContactCandidate | null {
  if (!isObject(item) || item.type !== 'contacts' || typeof item.id !== 'string' || !/^\d+$/.test(item.id)) return null
  const attributes = isObject(item.attributes) ? item.attributes : {}
  const accountType = attributes.account_type === 'customer' || attributes.account_type === 'supplier' ? attributes.account_type : null
  return { providerContactId: item.id, name: text(attributes.name, 'name'), email: email(attributes.email), taxNumber: text(attributes.tax_number, 'taxNumber'), accountType }
}

export function parseParasutContactCandidates(value: unknown): ParasutContactCandidate[] {
  if (!isObject(value) || !Array.isArray(value.data)) return []
  const result: ParasutContactCandidate[] = []
  const seen = new Set<string>()
  for (const item of value.data) {
    const candidate = safeContactCandidate(item)
    if (!candidate || seen.has(candidate.providerContactId)) continue
    seen.add(candidate.providerContactId)
    result.push(candidate)
  }
  return result
}

/** Returns only the numeric id from a successful JSON:API contact response. */
export function parseParasutCreatedContactId(value: unknown): string | null {
  if (!isObject(value) || !isObject(value.data) || value.data.type !== 'contacts' || typeof value.data.id !== 'string' || !/^\d+$/.test(value.data.id)) return null
  return value.data.id
}

function normalized(value: string | null | undefined): string | null {
  return value?.trim().toLowerCase() || null
}

export function resolveParasutContact(input: { candidates: readonly ParasutContactCandidate[]; query: { taxNumber?: string; email?: string; legalName?: string } }): ParasutContactResolution {
  const taxNumber = normalized(input.query.taxNumber)
  const contactEmail = normalized(input.query.email)
  const exactTax = taxNumber ? input.candidates.filter(candidate => normalized(candidate.taxNumber) === taxNumber) : []
  if (exactTax.length === 1) return { status: 'matched', providerContactId: exactTax[0].providerContactId, matchStrategy: 'exact_tax_number', requiresReview: false, requiresExplicitApproval: false }
  if (exactTax.length > 1) return { status: 'manual_review_required', requiresReview: true, requiresExplicitApproval: false }
  const exactEmail = contactEmail ? input.candidates.filter(candidate => normalized(candidate.email) === contactEmail) : []
  if (exactEmail.length === 1) return { status: 'matched', providerContactId: exactEmail[0].providerContactId, matchStrategy: 'exact_email', requiresReview: false, requiresExplicitApproval: false }
  if (exactEmail.length > 1 || input.candidates.length > 1) return { status: 'manual_review_required', requiresReview: true, requiresExplicitApproval: false }
  if (input.candidates.length === 1) return { status: 'manual_review_required', requiresReview: true, requiresExplicitApproval: false }
  if (text(input.query.legalName, 'legalName') && (taxNumber || contactEmail)) return { status: 'create_required', requiresReview: true, requiresExplicitApproval: true }
  return { status: 'manual_review_required', requiresReview: true, requiresExplicitApproval: false }
}

export const parasutContactAdapter = { buildParasutContactLookupRequest, buildParasutContactCreateRequest, parseParasutContactCandidates, parseParasutCreatedContactId, resolveParasutContact } as const
