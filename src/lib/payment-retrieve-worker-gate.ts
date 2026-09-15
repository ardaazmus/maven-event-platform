import { authorizeInternalWorkerSecret, parseInternalWorkerLimit } from '@/lib/internal-worker-auth'

type PaymentRetrieveWorkerGateInput = {
  expectedSecret: string | undefined
  providedSecret: string | null
  limit: string | null
}

export type PaymentRetrieveWorkerGateResult =
  | { ok: true; limit: number }
  | { ok: false; status: 400 | 401 | 503; reason: 'invalid_limit' | 'unauthorized' | 'worker_unavailable' }

/** Applies the internal retrieve worker authentication and bounded batch gate. */
export function authorizePaymentRetrieveWorkerRequest(
  input: PaymentRetrieveWorkerGateInput,
): PaymentRetrieveWorkerGateResult {
  if (!input.expectedSecret) return { ok: false, status: 503, reason: 'worker_unavailable' }
  if (!authorizeInternalWorkerSecret(input.expectedSecret, input.providedSecret)) {
    return { ok: false, status: 401, reason: 'unauthorized' }
  }

  const limit = parseInternalWorkerLimit(input.limit)
  if (limit === null) return { ok: false, status: 400, reason: 'invalid_limit' }
  return { ok: true, limit }
}
