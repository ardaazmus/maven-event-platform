import type { ParasutHealthProviderResult } from '@/lib/parasut-health'

const PARASUT_ME_URL = 'https://api.parasut.com/me'
const PARASUT_V4_URL = 'https://api.parasut.com/v4'
const HEALTH_TIMEOUT_MS = 5_000

export type ParasutCompanyRef = { id: string; name: string | null }
type ParasutHealthFailure = { kind: 'authentication' | 'rate_limited' | 'unavailable' | 'unknown'; retryable: boolean }

type JsonObject = Record<string, unknown>

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function bearerHeaders(accessToken: string): Record<string, string> {
  if (!accessToken || accessToken.length > 4_096) throw new Error('access token is invalid')
  return { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.api+json' }
}

export function buildParasutMeRequest(accessToken: string): { url: string; method: 'GET'; headers: Record<string, string> } {
  return { url: `${PARASUT_ME_URL}?include=companies`, method: 'GET', headers: bearerHeaders(accessToken) }
}

export function buildParasutCompanyHealthRequest(companyId: string, accessToken: string): { url: string; method: 'GET'; headers: Record<string, string> } {
  if (!/^\d+$/.test(companyId)) throw new Error('company id must be numeric')
  return { url: `${PARASUT_V4_URL}/${companyId}/contacts?page%5Bsize%5D=1`, method: 'GET', headers: bearerHeaders(accessToken) }
}

function safeCompanyName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const name = value.trim()
  return name ? name.slice(0, 160) : null
}

export function parseParasutCompanies(value: unknown): ParasutCompanyRef[] {
  if (!isObject(value) || !Array.isArray(value.included)) return []
  const result: ParasutCompanyRef[] = []
  const seen = new Set<string>()
  for (const item of value.included) {
    if (!isObject(item) || item.type !== 'companies' || typeof item.id !== 'string' || !/^\d+$/.test(item.id) || seen.has(item.id)) continue
    const attributes = isObject(item.attributes) ? item.attributes : null
    seen.add(item.id)
    result.push({ id: item.id, name: safeCompanyName(attributes?.name) })
  }
  return result
}

export function classifyParasutHealthResponse(status: number): ParasutHealthFailure {
  if (status === 401 || status === 403) return { kind: 'authentication', retryable: false }
  if (status === 429) return { kind: 'rate_limited', retryable: true }
  if (status >= 500 && status <= 599) return { kind: 'unavailable', retryable: true }
  return { kind: 'unknown', retryable: false }
}

async function requestJson(request: { url: string; method: 'GET'; headers: Record<string, string> }): Promise<{ response: Response; body: unknown }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)
  try {
    const response = await fetch(request.url, { method: request.method, headers: request.headers, signal: controller.signal, cache: 'no-store' })
    const body = await response.json().catch(() => null)
    return { response, body }
  } finally {
    clearTimeout(timeout)
  }
}

export async function discoverParasutCompanies(accessToken: string): Promise<{ ok: true; companies: ParasutCompanyRef[] } | { ok: false; kind: 'authentication' | 'rate_limited' | 'unavailable' | 'unknown'; retryable: boolean }> {
  try {
    const { response, body } = await requestJson(buildParasutMeRequest(accessToken))
    if (!response.ok) return { ok: false, ...classifyParasutHealthResponse(response.status) }
    return { ok: true, companies: parseParasutCompanies(body) }
  } catch {
    return { ok: false, kind: 'unavailable', retryable: true }
  }
}

export async function checkParasutCompanyHealth(companyId: string, accessToken: string): Promise<ParasutHealthProviderResult> {
  try {
    const { response } = await requestJson(buildParasutCompanyHealthRequest(companyId, accessToken))
    if (!response.ok) return { ok: false, ...classifyParasutHealthResponse(response.status) }
    return { ok: true, companyId, tokenValid: true }
  } catch {
    return { ok: false, kind: 'unavailable', retryable: true }
  }
}

export const parasutHealthClient = {
  discoverParasutCompanies,
  checkParasutCompanyHealth,
} as const
