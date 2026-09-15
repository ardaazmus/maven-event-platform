import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const VERSION = 'v1'
const AAD = Buffer.from('mavenforms-email-credential:v1')
const KEY_ENV = 'MAVENFORMS_EMAIL_ENCRYPTION_KEY'
const KEY_ID_ENV = 'MAVENFORMS_EMAIL_ENCRYPTION_KEY_ID'

function decodeBase64Url(value: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid base64url value')
  const decoded = Buffer.from(value, 'base64url')
  if (decoded.length === 0 || decoded.toString('base64url') !== value) throw new Error('non-canonical base64url value')
  return decoded
}

function decodeKey(keyValue: string | undefined): Buffer {
  if (!keyValue) throw new Error(`${KEY_ENV} is required for email credentials`)

  const key = decodeBase64Url(keyValue)
  if (key.length !== 32) throw new Error(`${KEY_ENV} must decode to 32 bytes`)
  return key
}

function keyId(env: NodeJS.ProcessEnv): string {
  const value = env[KEY_ID_ENV] || VERSION
  if (!/^[A-Za-z0-9._-]{1,32}$/.test(value)) throw new Error(`${KEY_ID_ENV} is invalid`)
  return value
}

function currentKey(env: NodeJS.ProcessEnv): { key: Buffer; id: string } {
  return { key: decodeKey(env[KEY_ENV]), id: keyId(env) }
}

/** Encrypts an email-provider secret into a versioned authenticated envelope. */
export function encryptEmailCredential(value: string, env: NodeJS.ProcessEnv = process.env): string {
  if (!value) throw new Error('email credential cannot be empty')

  const { key, id } = currentKey(env)
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  cipher.setAAD(AAD)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return [VERSION, id, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join(':')
}

/** Decrypts only email-provider secrets produced by the active credential format. */
export function decryptEmailCredential(envelope: string, env: NodeJS.ProcessEnv = process.env): string {
  const parts = envelope.split(':')
  if (parts.length !== 5 || parts.some(part => !part)) throw new Error('invalid email credential envelope')

  const [version, id, ivValue, tagValue, ciphertextValue] = parts
  if (version !== VERSION) throw new Error('invalid email credential envelope')

  const { key, id: currentId } = currentKey(env)
  if (id !== currentId) throw new Error('email credential key is not active')

  try {
    const iv = decodeBase64Url(ivValue)
    const tag = decodeBase64Url(tagValue)
    const ciphertext = decodeBase64Url(ciphertextValue)
    if (iv.length !== 12 || tag.length !== 16) throw new Error('invalid email credential envelope')

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAAD(AAD)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  } catch {
    throw new Error('email credential authentication failed')
  }
}

export const emailCredentialEnv = {
  key: KEY_ENV,
  keyId: KEY_ID_ENV,
} as const
