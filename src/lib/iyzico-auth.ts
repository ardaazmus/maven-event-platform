import { createHmac, randomInt } from 'node:crypto'

type IyzicoAuthorizationInput = {
  apiKey: string
  secretKey: string
  path: string
  body: string
  randomKey?: string
}

type IyzicoAuthorizationResult =
  | { ok: true; headers: { Authorization: string; 'Content-Type': 'application/json'; 'x-iyzi-rnd': string } }
  | { ok: false; reason: 'input_invalid' | 'credential_invalid' | 'path_invalid' | 'body_invalid' | 'body_forbidden' }

function containsForbiddenKeys(value: unknown, depth = 0, seen = new WeakSet<object>()): boolean {
  if (depth > 8) return true
  if (typeof value !== 'object' || value === null) return false
  if (seen.has(value)) return true
  seen.add(value)
  if (Array.isArray(value)) return value.some(item => containsForbiddenKeys(item, depth + 1, seen))
  const forbidden = new Set(['secret', 'secretKey', 'apiKey', 'webhookSecret', 'cardNumber', 'cvv', 'cvc', 'pan', 'credentials'])
  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => forbidden.has(key) || containsForbiddenKeys(nested, depth + 1, seen))
}

/** Creates iyzico IYZWSv2 headers at the server boundary using the documented HMACSHA256 flow. */
export function createIyzicoAuthorization(input: IyzicoAuthorizationInput): IyzicoAuthorizationResult {
  if (!input || typeof input !== 'object') return { ok: false, reason: 'input_invalid' }
  if ([input.apiKey, input.secretKey].some(value => typeof value !== 'string' || !value || value.length > 500 || /[\r\n\0]/.test(value))) {
    return { ok: false, reason: 'credential_invalid' }
  }
  if (typeof input.path !== 'string' || !/^\/[^\r\n?#]*$/.test(input.path)) return { ok: false, reason: 'path_invalid' }
  if (typeof input.body !== 'string' || Buffer.byteLength(input.body, 'utf8') > 1024 * 1024) return { ok: false, reason: 'body_invalid' }
  try {
    if (containsForbiddenKeys(JSON.parse(input.body))) return { ok: false, reason: 'body_forbidden' }
  } catch {
    return { ok: false, reason: 'body_invalid' }
  }
  const randomKey = input.randomKey ?? `${Date.now()}${randomInt(100000, 999999)}`
  if (!/^[A-Za-z0-9_-]{6,100}$/.test(randomKey)) return { ok: false, reason: 'input_invalid' }
  const signature = createHmac('sha256', input.secretKey).update(`${randomKey}${input.path}${input.body}`, 'utf8').digest('hex')
  const authorizationPayload = `apiKey:${input.apiKey}&randomKey:${randomKey}&signature:${signature}`
  return {
    ok: true,
    headers: {
      Authorization: `IYZWSv2 ${Buffer.from(authorizationPayload, 'utf8').toString('base64')}`,
      'Content-Type': 'application/json',
      'x-iyzi-rnd': randomKey,
    },
  }
}
