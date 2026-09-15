import { createHmac, timingSafeEqual } from 'node:crypto'
import { createIyzicoAuthorization } from '@/lib/iyzico-auth'
import { parseIyzicoCredentialSet } from '@/lib/iyzico-credentials-contract'

type IyzicoRetrieveFailureCategory = 'configuration' | 'not_found' | 'rate_limited' | 'unavailable' | 'unknown'

export type IyzicoRetrieveResult =
  | { ok: true; providerPaymentId: string; status: 'requires_action' | 'processing' | 'succeeded' | 'failed'; amountMinor: number; currency: string }
  | { ok: false; category: IyzicoRetrieveFailureCategory; code: string }

export type IyzicoRetrieveInput = {
  mode: 'test' | 'live'
  baseUrl: string
  credentials: unknown
  token: string
  locale?: 'tr' | 'en'
  conversationId?: string
  randomKey?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

const retrievePath = '/payment/iyzipos/checkoutform/auth/ecom/detail'
const supportedCurrencies = new Set(['TRY', 'USD', 'EUR', 'NOK', 'CHF', 'GBP'])
const DEFAULT_TIMEOUT_MS = 8_000
const MIN_TIMEOUT_MS = 250
const MAX_TIMEOUT_MS = 30_000

function failureForStatus(status: number): { category: IyzicoRetrieveFailureCategory; code: string } {
  if (status === 400 || status === 401 || status === 403) return { category: 'configuration', code: 'iyzico_retrieve_request_rejected' }
  if (status === 404) return { category: 'not_found', code: 'iyzico_payment_not_found' }
  if (status === 429) return { category: 'rate_limited', code: 'iyzico_rate_limited' }
  if (status >= 500) return { category: 'unavailable', code: 'iyzico_unavailable' }
  return { category: 'unknown', code: 'iyzico_retrieve_request_failed' }
}

function isValidTimeout(value: number): boolean {
  return Number.isSafeInteger(value) && value >= MIN_TIMEOUT_MS && value <= MAX_TIMEOUT_MS
}

function parseMinorAmount(value: unknown): number | null {
  const text = typeof value === 'number' && Number.isFinite(value) ? value.toString() : typeof value === 'string' ? value : null
  if (!text || !/^\d+(?:\.\d{1,2})?$/.test(text)) return null
  const [whole, fraction = ''] = text.split('.')
  const minor = Number(`${whole}${fraction.padEnd(2, '0')}`)
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null
}

function canonicalDecimal(value: unknown): string | null {
  const text = typeof value === 'number' && Number.isFinite(value) ? value.toString() : typeof value === 'string' ? value : null
  if (!text || !/^\d+(?:\.\d+)?$/.test(text)) return null
  return text.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '').replace(/\.$/, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function paymentStatus(value: unknown, fraudStatus: unknown): 'requires_action' | 'processing' | 'succeeded' | 'failed' | null {
  if (value === 'FAILURE') return 'failed'
  if (value === 'INIT_THREEDS' || value === 'CALLBACK_THREEDS') return 'requires_action'
  if (value !== 'SUCCESS') return null
  if (fraudStatus === 1) return 'succeeded'
  if (fraudStatus === 0) return 'processing'
  if (fraudStatus === -1) return 'failed'
  return null
}

function verifyOptionalResponseSignature(record: Record<string, unknown>, secretKey: string, currency: string, token: string): boolean {
  if (record.signature === undefined) return true
  if (typeof record.signature !== 'string' || !/^[a-f0-9]{64}$/i.test(record.signature)) return false
  const paymentStatusValue = typeof record.paymentStatus === 'string' ? record.paymentStatus : null
  const paymentId = typeof record.paymentId === 'string' ? record.paymentId : typeof record.paymentId === 'number' && Number.isSafeInteger(record.paymentId) ? String(record.paymentId) : null
  const basketId = typeof record.basketId === 'string' ? record.basketId : null
  const conversationId = typeof record.conversationId === 'string' ? record.conversationId : null
  const paidPrice = canonicalDecimal(record.paidPrice)
  const price = canonicalDecimal(record.price)
  if (!paymentStatusValue || !paymentId || !basketId || !conversationId || !paidPrice || !price) return false
  const message = [paymentStatusValue, paymentId, currency, basketId, conversationId, paidPrice, price, token].join(':')
  const expected = createHmac('sha256', secretKey).update(message, 'utf8').digest('hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  const actualBuffer = Buffer.from(record.signature, 'hex')
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
}

/** Retrieves an iyzico Checkout Form result by token and returns only the internal payment contract. */
export async function retrieveIyzicoCheckoutFormPayment(input: IyzicoRetrieveInput): Promise<IyzicoRetrieveResult> {
  const expectedHost = input.mode === 'test' ? 'sandbox-api.iyzipay.com' : 'api.iyzipay.com'
  let baseUrl: URL
  try {
    baseUrl = new URL(input.baseUrl)
    if (baseUrl.protocol !== 'https:' || baseUrl.hostname !== expectedHost || baseUrl.pathname !== '/') throw new Error('base URL mismatch')
  } catch {
    return { ok: false, category: 'configuration', code: 'iyzico_base_url_mode_mismatch' }
  }
  if (typeof input.token !== 'string' || !/^[A-Za-z0-9_-]{8,255}$/.test(input.token)) return { ok: false, category: 'configuration', code: 'iyzico_retrieve_token_invalid' }
  if (input.conversationId !== undefined && (typeof input.conversationId !== 'string' || !/^[A-Za-z0-9_.:-]{1,255}$/.test(input.conversationId))) {
    return { ok: false, category: 'configuration', code: 'iyzico_retrieve_conversation_invalid' }
  }
  const credentials = parseIyzicoCredentialSet(input.credentials)
  if (!credentials.ok) return { ok: false, category: 'configuration', code: `iyzico_${credentials.reason}` }
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS
  if (!isValidTimeout(timeoutMs)) return { ok: false, category: 'configuration', code: 'iyzico_timeout_invalid' }

  const bodyValue = { locale: input.locale ?? 'tr', ...(input.conversationId ? { conversationId: input.conversationId } : {}), token: input.token }
  const body = JSON.stringify(bodyValue)
  const authorization = createIyzicoAuthorization({ ...credentials.credentials, path: retrievePath, body, randomKey: input.randomKey })
  if (!authorization.ok) return { ok: false, category: 'configuration', code: `iyzico_${authorization.reason}` }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await (input.fetchImpl ?? fetch)(new URL(retrievePath, baseUrl).toString(), {
      method: 'POST',
      redirect: 'error',
      headers: authorization.headers,
      body,
      signal: controller.signal,
    })
    if (!response.ok) return { ok: false, ...failureForStatus(response.status) }
    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      return { ok: false, category: 'unknown', code: 'iyzico_retrieve_response_invalid_json' }
    }
    if (!isRecord(payload) || payload.status !== 'success') return { ok: false, category: 'unknown', code: 'iyzico_retrieve_request_rejected' }
    if (payload.token !== undefined && payload.token !== input.token) return { ok: false, category: 'unknown', code: 'iyzico_retrieve_response_contract_invalid' }
    const currency = typeof payload.currency === 'string' ? payload.currency.toUpperCase() : null
    const amountMinor = parseMinorAmount(payload.paidPrice)
    const status = paymentStatus(payload.paymentStatus, payload.fraudStatus)
    if (!currency || !supportedCurrencies.has(currency) || amountMinor === null || status === null || !verifyOptionalResponseSignature(payload, credentials.credentials.secretKey, currency, input.token)) {
      if (payload.signature !== undefined) return { ok: false, category: 'unknown', code: 'iyzico_retrieve_response_signature_invalid' }
      return { ok: false, category: 'unknown', code: 'iyzico_retrieve_response_contract_invalid' }
    }
    return { ok: true, providerPaymentId: input.token, status, amountMinor, currency }
  } catch {
    return { ok: false, category: 'unavailable', code: controller.signal.aborted ? 'iyzico_retrieve_timeout' : 'iyzico_network_error' }
  } finally {
    clearTimeout(timeout)
  }
}
