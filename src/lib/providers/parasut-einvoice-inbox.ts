import { PARASUT_API_V4_BASE, type ParasutEInvoiceInbox, type ParasutEInvoiceInboxCommand, type ParasutFailure, type ParasutResult } from '@/lib/providers/parasut-v4'

const MAX_PAGE_SIZE = 25

export type ParasutEInvoiceInboxRequest = {
  url: string
  method: 'GET'
  headers: { accept: string; authorization: string }
}

export type ParasutEInvoiceInboxTransportResponse = {
  status: number
  json?: unknown
}

export type ParasutEInvoiceInboxTransport = {
  get(request: ParasutEInvoiceInboxRequest): Promise<ParasutEInvoiceInboxTransportResponse>
}

type ParsedInboxList = { valid: true; found: boolean } | { valid: false }

function numericCompanyId(value: string): boolean {
  return /^\d+$/.test(value) && value !== '0'
}

function validVkn(value: string): boolean {
  return /^\d{10}$/.test(value)
}

function failure(code: string, kind: ParasutFailure['kind'], providerStatus: number | null, retryable: boolean): ParasutResult<never> {
  return { ok: false, error: { code, kind, providerStatus, retryable } }
}

/** Builds the official bounded VKN inbox lookup request without exposing provider credentials to callers. */
export function buildParasutEInvoiceInboxRequest(companyId: string, accessToken: string, taxNumber: string): ParasutEInvoiceInboxRequest {
  if (!numericCompanyId(companyId)) throw new Error('parasut company id is invalid')
  if (!accessToken.trim()) throw new Error('parasut access token is required')
  if (!validVkn(taxNumber)) throw new Error('parasut VKN is invalid')

  const query = new URLSearchParams({ 'filter[vkn]': taxNumber, 'page[number]': '1', 'page[size]': String(MAX_PAGE_SIZE) })
  return {
    url: `${PARASUT_API_V4_BASE}/${companyId}/e_invoice_inboxes?${query.toString()}`,
    method: 'GET',
    headers: { accept: 'application/vnd.api+json', authorization: `Bearer ${accessToken}` },
  }
}

function parseInboxList(value: unknown): ParsedInboxList {
  if (!value || typeof value !== 'object' || !('data' in value)) return { valid: false }
  const data = (value as { data?: unknown }).data
  if (!Array.isArray(data)) return { valid: false }
  for (const item of data) {
    if (!item || typeof item !== 'object' || !('type' in item) || !('id' in item)) return { valid: false }
    const resource = item as { type?: unknown; id?: unknown }
    if (resource.type !== 'e_invoice_inboxes' || typeof resource.id !== 'string' || !/^\d+$/.test(resource.id)) return { valid: false }
  }
  return { valid: true, found: data.length > 0 }
}

/** Reduces only a valid JSON:API inbox list to a boolean; malformed data never becomes e-Arşiv eligibility. */
export function parseParasutEInvoiceInboxResponse(value: unknown): { found: boolean } | null {
  const parsed = parseInboxList(value)
  return parsed.valid ? { found: parsed.found } : null
}

function providerFailure(status: number): ParasutResult<never> {
  if (status === 401 || status === 403) return failure('parasut_einvoice_authentication_failed', 'authentication', status, false)
  if (status === 429) return failure('parasut_einvoice_rate_limited', 'rate_limited', status, true)
  if (status >= 500) return failure('parasut_einvoice_unavailable', 'unavailable', status, true)
  if (status >= 400) return failure('parasut_einvoice_lookup_rejected', 'validation', status, false)
  return failure('parasut_einvoice_unknown_response', 'unknown', status, false)
}

/** Performs one server-side lookup and returns a time-stamped internal snapshot only. */
export async function lookupParasutEInvoiceInbox(
  input: ParasutEInvoiceInboxCommand,
  accessToken: string,
  transport: ParasutEInvoiceInboxTransport,
  now: () => Date = () => new Date(),
): Promise<ParasutResult<ParasutEInvoiceInbox>> {
  if (!validVkn(input.taxNumber)) return failure('parasut_einvoice_vkn_invalid', 'validation', null, false)
  const request = buildParasutEInvoiceInboxRequest(input.companyId, accessToken, input.taxNumber)
  let response: ParasutEInvoiceInboxTransportResponse
  try {
    response = await transport.get(request)
  } catch {
    return failure('parasut_einvoice_lookup_unavailable', 'unavailable', null, true)
  }
  if (response.status !== 200) return providerFailure(response.status)
  const parsed = parseParasutEInvoiceInboxResponse(response.json)
  if (!parsed) return failure('parasut_einvoice_response_invalid', 'unknown', response.status, false)
  return { ok: true, data: { taxNumber: input.taxNumber, found: parsed.found, checkedAt: now().toISOString() } }
}
