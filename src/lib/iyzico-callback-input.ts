import { isPublicPaymentKey } from '@/lib/payment-status-key'

type IyzicoCallbackResult =
  | { ok: true; provider: 'iyzico'; token: string; publicKey?: string; nextState: 'processing' }
  | { ok: false; reason: 'input_invalid' | 'unknown_field' | 'token_invalid' | 'status_invalid' | 'public_key_invalid' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Parses only the opaque iyzico callback token; provider status never becomes a financial state. */
export function parseIyzicoCallbackInput(value: unknown): IyzicoCallbackResult {
  if (!isRecord(value)) return { ok: false, reason: 'input_invalid' }
  const allowed = new Set(['token', 'status', 'receipt'])
  if (Object.keys(value).some(key => !allowed.has(key))) return { ok: false, reason: 'unknown_field' }
  if (typeof value.token !== 'string' || !/^[A-Za-z0-9_-]{8,255}$/.test(value.token)) return { ok: false, reason: 'token_invalid' }
  if (value.status !== undefined && (typeof value.status !== 'string' || !/^[A-Za-z0-9_-]{1,50}$/.test(value.status))) return { ok: false, reason: 'status_invalid' }
  if (value.receipt !== undefined && !isPublicPaymentKey(value.receipt)) return { ok: false, reason: 'public_key_invalid' }
  return { ok: true, provider: 'iyzico', token: value.token, ...(value.receipt !== undefined ? { publicKey: value.receipt as string } : {}), nextState: 'processing' }
}
