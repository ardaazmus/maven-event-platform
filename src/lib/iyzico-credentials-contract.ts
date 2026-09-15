type IyzicoCredentialSet = {
  apiKey: string
  secretKey: string
  webhookSecret?: string
}

type IyzicoCredentialResult =
  | { ok: true; credentials: IyzicoCredentialSet }
  | { ok: false; reason: 'input_invalid' | 'unexpected_field' | 'credential_invalid' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Validates decrypted iyzico credentials at the server-only adapter boundary; never serializes them. */
export function parseIyzicoCredentialSet(value: unknown): IyzicoCredentialResult {
  if (!isRecord(value)) return { ok: false, reason: 'input_invalid' }
  const allowed = new Set(['apiKey', 'secretKey', 'webhookSecret'])
  if (Object.keys(value).some(key => !allowed.has(key))) return { ok: false, reason: 'unexpected_field' }
  const apiKey = value.apiKey
  const secretKey = value.secretKey
  const webhookSecret = value.webhookSecret
  if (typeof apiKey !== 'string' || typeof secretKey !== 'string' || !apiKey || !secretKey) return { ok: false, reason: 'credential_invalid' }
  if (webhookSecret !== undefined && typeof webhookSecret !== 'string') return { ok: false, reason: 'credential_invalid' }
  const allSecrets = [apiKey, secretKey, webhookSecret]
  if (allSecrets.some(secret => secret !== undefined && (!secret || secret.length > 500 || /[\r\n\0]/.test(secret)))) {
    return { ok: false, reason: 'credential_invalid' }
  }
  const validatedWebhookSecret = webhookSecret as string | undefined
  return {
    ok: true,
    credentials: validatedWebhookSecret === undefined ? { apiKey, secretKey } : { apiKey, secretKey, webhookSecret: validatedWebhookSecret },
  }
}
