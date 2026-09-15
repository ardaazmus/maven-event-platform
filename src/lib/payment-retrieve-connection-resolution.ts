import type { PaymentRetrieveAdapter } from '@/lib/payment-retrieve-adapter-registry'
import { resolvePaymentRetrieveAdapter } from '@/lib/payment-retrieve-adapter-registry'
import type { PaymentRetrieveJob } from '@/lib/payment-retrieve-job'
import { isPaymentProvider, type PaymentProviderMode } from '@/lib/payment-provider-contract'

type PaymentOrderSnapshot = {
  workspaceId: string
  provider: string
  mode: string
}

type PaymentAttemptLookupTransaction = {
  paymentAttempt: {
    findUnique(args: {
      where: { id: string }
      select: { paymentOrder: { select: { workspaceId: true; provider: true; mode: true } } }
    }): Promise<{ paymentOrder: PaymentOrderSnapshot | null } | null>
  }
  paymentProviderConnection: {
    findUnique(args: {
      where: { workspaceId_provider_mode: { workspaceId: string; provider: string; mode: string } }
      select: { provider: true; mode: true; status: true; credentialsEnvelope: true }
    }): Promise<{ provider: string; mode: string; status: string; credentialsEnvelope: string | null } | null>
  }
}

type PaymentRetrieveConnectionInput = {
  job: PaymentRetrieveJob
  env?: NodeJS.ProcessEnv
}

export type PaymentRetrieveConnectionResolution =
  | { ok: true; provider: PaymentRetrieveJob['provider']; mode: PaymentProviderMode; hasCredentials: true; adapter: PaymentRetrieveAdapter }
  | { ok: false; reason: 'attempt_not_found' | 'connection_not_found' | 'connection_mismatch' | 'connection_not_active' | 'credentials_missing' | 'credentials_invalid' | 'adapter_unavailable' | 'live_disabled' }

function isProviderMode(value: string): value is PaymentProviderMode {
  return value === 'test' || value === 'live'
}

/** Resolves a claimed payment job to its workspace-scoped active provider connection without returning secrets. */
export async function resolvePaymentRetrieveConnection(
  tx: PaymentAttemptLookupTransaction,
  input: PaymentRetrieveConnectionInput,
): Promise<PaymentRetrieveConnectionResolution> {
  const attempt = await tx.paymentAttempt.findUnique({
    where: { id: input.job.attemptId },
    select: { paymentOrder: { select: { workspaceId: true, provider: true, mode: true } } },
  })
  if (!attempt?.paymentOrder) return { ok: false, reason: 'attempt_not_found' }

  const order = attempt.paymentOrder
  if (!isPaymentProvider(order.provider) || order.provider !== input.job.provider || !isProviderMode(order.mode)) {
    return { ok: false, reason: 'connection_mismatch' }
  }
  if (order.mode === 'live' && input.env?.PAYMENT_LIVE_ENABLED !== 'true') return { ok: false, reason: 'live_disabled' }

  const connection = await tx.paymentProviderConnection.findUnique({
    where: {
      workspaceId_provider_mode: {
        workspaceId: order.workspaceId,
        provider: order.provider,
        mode: order.mode,
      },
    },
    select: { provider: true, mode: true, status: true, credentialsEnvelope: true },
  })
  if (!connection) return { ok: false, reason: 'connection_not_found' }
  if (connection.provider !== input.job.provider || connection.mode !== order.mode) return { ok: false, reason: 'connection_mismatch' }
  if (connection.status !== 'active') return { ok: false, reason: 'connection_not_active' }

  const resolved = resolvePaymentRetrieveAdapter({
    provider: input.job.provider,
    mode: order.mode,
    credentialsEnvelope: connection.credentialsEnvelope,
    env: input.env,
  })
  if (resolved.ok) return resolved
  if (resolved.reason === 'provider_invalid' || resolved.reason === 'mode_invalid') return { ok: false, reason: 'connection_mismatch' }
  return { ok: false, reason: resolved.reason }
}
