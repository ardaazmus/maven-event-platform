import { isPaymentProvider } from '@/lib/payment-provider-contract'

type PaymentConnectionGateResult =
  | { ok: true }
  | { ok: false; reason: 'input_invalid' | 'workspace_mismatch' | 'published_provider_mismatch' | 'provider_mismatch' | 'mode_mismatch' | 'connection_not_active' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Enforces the private connection boundary before a published public payment can reach a provider adapter. */
export function evaluatePaymentConnectionGate(input: unknown): PaymentConnectionGateResult {
  if (!isRecord(input) || !isRecord(input.payment) || !isRecord(input.config) || !isRecord(input.connection)) {
    return { ok: false, reason: 'input_invalid' }
  }
  const workspaceId = input.workspaceId
  const paymentProvider = input.payment.provider
  const configProvider = input.config.provider
  const configMode = input.config.mode
  const connection = input.connection
  if (typeof workspaceId !== 'string' || typeof paymentProvider !== 'string' || !isPaymentProvider(paymentProvider)) return { ok: false, reason: 'input_invalid' }
  if (paymentProvider !== configProvider) return { ok: false, reason: 'published_provider_mismatch' }
  if (connection.workspaceId !== workspaceId) return { ok: false, reason: 'workspace_mismatch' }
  if (connection.provider !== configProvider) return { ok: false, reason: 'provider_mismatch' }
  if (connection.mode !== configMode) return { ok: false, reason: 'mode_mismatch' }
  if (connection.status !== 'active') return { ok: false, reason: 'connection_not_active' }
  return { ok: true }
}
