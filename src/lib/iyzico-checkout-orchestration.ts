import { decryptPaymentCredential } from '@/lib/payment-credentials'
import { parseIyzicoCredentialSet } from '@/lib/iyzico-credentials-contract'
import { initializeIyzicoCheckoutForm } from '@/lib/iyzico-checkout-client'
import { buildIyzicoCheckoutFormRequest } from '@/lib/iyzico-checkout-request'
import { attachProviderCheckout } from '@/lib/payment-order-checkout-persistence'

type HostedIyzicoCheckoutInput = {
  connection: unknown
  order: unknown
  paymentOrderId: unknown
  basketId: unknown
  productName: unknown
  callbackUrl: unknown
  buyer: unknown
  env?: NodeJS.ProcessEnv
  randomKey?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
  tx: Parameters<typeof attachProviderCheckout>[0]
}

type HostedIyzicoCheckoutResult =
  | { ok: true; redirectUrl: string; status: 'requires_action'; reused: boolean }
  | { ok: false; reason: 'connection_invalid' | 'credentials_invalid' | 'request_invalid' | 'provider_error' | 'attach_failed' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isInternalId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(value)
}

function credentialsFromEnvelope(envelope: string, env: NodeJS.ProcessEnv | undefined) {
  try {
    const decrypted = decryptPaymentCredential(envelope, env)
    const parsed: unknown = JSON.parse(decrypted)
    const credentials = parseIyzicoCredentialSet(parsed)
    return credentials.ok ? credentials.credentials : null
  } catch {
    return null
  }
}

/** Initializes a hosted iyzico checkout and atomically attaches its provider reference to an existing order. */
export async function initializeHostedIyzicoCheckout(input: HostedIyzicoCheckoutInput): Promise<HostedIyzicoCheckoutResult> {
  if (!isRecord(input.connection) || input.connection.provider !== 'iyzico' || (input.connection.mode !== 'test' && input.connection.mode !== 'live') || input.connection.status !== 'active' || typeof input.connection.credentialsEnvelope !== 'string' || !isInternalId(input.paymentOrderId)) {
    return { ok: false, reason: 'connection_invalid' }
  }

  const credentials = credentialsFromEnvelope(input.connection.credentialsEnvelope, input.env)
  if (!credentials) return { ok: false, reason: 'credentials_invalid' }

  const request = buildIyzicoCheckoutFormRequest({
    order: input.order,
    basketId: input.basketId,
    productName: input.productName,
    callbackUrl: input.callbackUrl,
    buyer: input.buyer,
  })
  if (!request.ok) return { ok: false, reason: 'request_invalid' }

  const client = await initializeIyzicoCheckoutForm({
    mode: input.connection.mode,
    baseUrl: input.connection.mode === 'test' ? 'https://sandbox-api.iyzipay.com' : 'https://api.iyzipay.com',
    credentials,
    request: request.request,
    ...(input.randomKey ? { randomKey: input.randomKey } : {}),
    ...(input.fetchImpl ? { fetchImpl: input.fetchImpl } : {}),
    ...(input.timeoutMs !== undefined ? { timeoutMs: input.timeoutMs } : {}),
  })
  if (!client.ok) return { ok: false, reason: 'provider_error' }

  try {
    const attached = await attachProviderCheckout(input.tx, {
      paymentOrderId: input.paymentOrderId,
      provider: 'iyzico',
      providerReference: client.token,
      status: 'requires_action',
    })
    if (!attached.ok) return { ok: false, reason: 'attach_failed' }
    if (attached.status !== 'requires_action') return { ok: false, reason: 'attach_failed' }
    return { ok: true, redirectUrl: client.paymentPageUrl, status: 'requires_action', reused: attached.reused }
  } catch {
    return { ok: false, reason: 'attach_failed' }
  }
}

type StoredConnectionCheckoutInput = Omit<HostedIyzicoCheckoutInput, 'connection'> & {
  workspaceId: unknown
  connectionId: unknown
}

/** Resolves the active workspace-scoped connection server-side before checkout; credentials never cross the public route boundary. */
export async function initializeHostedIyzicoCheckoutForStoredConnection(input: StoredConnectionCheckoutInput): Promise<HostedIyzicoCheckoutResult> {
  if (!isInternalId(input.workspaceId) || !isInternalId(input.connectionId)) return { ok: false, reason: 'connection_invalid' }
  const connectionClient = input.tx as HostedIyzicoCheckoutInput['tx'] & {
    paymentProviderConnection: {
      findFirst(args: { where: { id: string; workspaceId: string; provider: 'iyzico'; mode: 'test'; status: 'active' }; select: { id: true; workspaceId: true; provider: true; mode: true; status: true; credentialsEnvelope: true } }): Promise<{ id: string; workspaceId: string; provider: string; mode: string; status: string; credentialsEnvelope: string | null } | null>
    }
  }
  const connection = await connectionClient.paymentProviderConnection.findFirst({
    where: { id: input.connectionId, workspaceId: input.workspaceId, provider: 'iyzico', mode: 'test', status: 'active' },
    select: { id: true, workspaceId: true, provider: true, mode: true, status: true, credentialsEnvelope: true },
  })
  if (!connection) return { ok: false, reason: 'connection_invalid' }
  return initializeHostedIyzicoCheckout({ ...input, connection })
}
