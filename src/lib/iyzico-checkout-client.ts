import { createIyzicoAuthorization } from '@/lib/iyzico-auth'
import { parseIyzicoCredentialSet } from '@/lib/iyzico-credentials-contract'

type IyzicoCheckoutClientInput = {
  mode: 'test' | 'live'
  baseUrl: string
  credentials: unknown
  request: Record<string, unknown>
  randomKey?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

type IyzicoFailureCategory = 'configuration' | 'rate_limited' | 'unavailable' | 'unknown'

type IyzicoCheckoutClientResult =
  | { ok: true; token: string; paymentPageUrl: string; status: 'success' }
  | { ok: false; category: IyzicoFailureCategory; code: string }

const checkoutPath = '/payment/iyzipos/checkoutform/initialize/auth/ecom'

function failureForStatus(status: number): { category: IyzicoFailureCategory; code: string } {
  if (status === 400 || status === 401 || status === 403) return { category: 'configuration', code: 'iyzico_checkout_request_rejected' }
  if (status === 429) return { category: 'rate_limited', code: 'iyzico_rate_limited' }
  if (status >= 500) return { category: 'unavailable', code: 'iyzico_unavailable' }
  return { category: 'unknown', code: 'iyzico_checkout_request_failed' }
}

function trustedPaymentPageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    const trustedHost = url.protocol === 'https:' && (url.hostname === 'iyzico.com' || url.hostname.endsWith('.iyzico.com') || url.hostname === 'iyzipay.com' || url.hostname.endsWith('.iyzipay.com'))
    return trustedHost ? url.toString() : null
  } catch {
    return null
  }
}

/** Calls only iyzico's hosted Checkout Form endpoint and returns a minimized redirect contract. */
export async function initializeIyzicoCheckoutForm(input: IyzicoCheckoutClientInput): Promise<IyzicoCheckoutClientResult> {
  if (!input || typeof input !== 'object') return { ok: false, category: 'configuration', code: 'iyzico_input_invalid' }
  const expectedHost = input.mode === 'test' ? 'sandbox-api.iyzipay.com' : 'api.iyzipay.com'
  let baseUrl: URL
  try {
    baseUrl = new URL(input.baseUrl)
    if (baseUrl.protocol !== 'https:' || baseUrl.hostname !== expectedHost || baseUrl.pathname !== '/') throw new Error('base URL mismatch')
  } catch {
    return { ok: false, category: 'configuration', code: 'iyzico_base_url_mode_mismatch' }
  }
  const credentials = parseIyzicoCredentialSet(input.credentials)
  if (!credentials.ok) return { ok: false, category: 'configuration', code: `iyzico_${credentials.reason}` }
  let body: string
  try {
    body = JSON.stringify(input.request)
  } catch {
    return { ok: false, category: 'unknown', code: 'iyzico_checkout_request_invalid' }
  }
  const authorization = createIyzicoAuthorization({ ...credentials.credentials, path: checkoutPath, body, randomKey: input.randomKey })
  if (!authorization.ok) return { ok: false, category: 'configuration', code: `iyzico_${authorization.reason}` }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 8_000)
  try {
    const response = await (input.fetchImpl ?? fetch)(new URL(checkoutPath, baseUrl).toString(), {
      method: 'POST',
      headers: authorization.headers,
      body,
      signal: controller.signal,
    })
    if (!response.ok) return { ok: false, ...failureForStatus(response.status) }
    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      return { ok: false, category: 'unknown', code: 'iyzico_checkout_response_invalid_json' }
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { ok: false, category: 'unknown', code: 'iyzico_checkout_response_invalid' }
    const record = payload as Record<string, unknown>
    const token = typeof record.token === 'string' && /^[A-Za-z0-9_-]{8,255}$/.test(record.token) ? record.token : null
    const paymentPageUrl = trustedPaymentPageUrl(record.paymentPageUrl)
    if (record.status !== 'success' || !token || !paymentPageUrl) return { ok: false, category: 'unknown', code: 'iyzico_checkout_response_contract_invalid' }
    return { ok: true, token, paymentPageUrl, status: 'success' }
  } catch {
    return { ok: false, category: 'unavailable', code: controller.signal.aborted ? 'iyzico_checkout_timeout' : 'iyzico_network_error' }
  } finally {
    clearTimeout(timeout)
  }
}
