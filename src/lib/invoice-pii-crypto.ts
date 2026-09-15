import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const VERSION = 'v1'
const AAD = Buffer.from('mavenforms-invoice-pii:v1', 'utf8')
const KEY_ENV = 'MAVENFORMS_INVOICE_PII_KEY'
const KEY_ID_ENV = 'MAVENFORMS_INVOICE_PII_KEY_ID'

function keyFromEnv(env: NodeJS.ProcessEnv): Buffer {
  const value = env[KEY_ENV]
  if (!value) throw new Error(`${KEY_ENV} is required`)
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error(`${KEY_ENV} must be a 256-bit hex key`)
  return Buffer.from(value, 'hex')
}

function keyIdFromEnv(env: NodeJS.ProcessEnv): string {
  const value = env[KEY_ID_ENV] || 'v1'
  if (!/^[A-Za-z0-9._-]{1,32}$/.test(value)) throw new Error(`${KEY_ID_ENV} is invalid`)
  return value
}

function encode(value: Buffer): string {
  return value.toString('base64url')
}

function decode(value: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid encrypted value')
  const decoded = Buffer.from(value, 'base64url')
  if (encode(decoded) !== value) throw new Error('invalid encrypted value')
  return decoded
}

/** Encrypts invoice recipient PII with a configured AES-256-GCM key. */
export function encryptInvoicePii(value: string, env: NodeJS.ProcessEnv = process.env): string {
  if (!value) throw new Error('invoice PII cannot be empty')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyFromEnv(env), iv)
  cipher.setAAD(AAD)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return [VERSION, keyIdFromEnv(env), encode(iv), encode(cipher.getAuthTag()), encode(ciphertext)].join(':')
}

/** Decrypts only the active invoice PII envelope; never expose the result at a public boundary. */
export function decryptInvoicePii(envelope: string, env: NodeJS.ProcessEnv = process.env): string {
  const parts = envelope.split(':')
  if (parts.length !== 5 || parts[0] !== VERSION || parts[1] !== keyIdFromEnv(env)) throw new Error('invalid invoice PII envelope')
  const iv = decode(parts[2])
  const tag = decode(parts[3])
  const ciphertext = decode(parts[4])
  if (iv.length !== 12 || tag.length !== 16) throw new Error('invalid invoice PII envelope')
  const decipher = createDecipheriv('aes-256-gcm', keyFromEnv(env), iv)
  decipher.setAAD(AAD)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
