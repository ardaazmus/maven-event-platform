import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const VERSION = 'v1'
const AAD = Buffer.from('mavenforms-parasut-credential:v1')
const KEY_ENV = 'MAVENFORMS_PARASUT_ENCRYPTION_KEY'
const KEY_ID_ENV = 'MAVENFORMS_PARASUT_ENCRYPTION_KEY_ID'

function decode(value: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid base64url value')
  const result = Buffer.from(value, 'base64url')
  if (!result.length || result.toString('base64url') !== value) throw new Error('non-canonical base64url value')
  return result
}

function key(env: NodeJS.ProcessEnv): { value: Buffer; id: string } {
  const encoded = env[KEY_ENV]
  if (!encoded) throw new Error(`${KEY_ENV} is required for Paraşüt credentials`)
  const value = decode(encoded)
  if (value.length !== 32) throw new Error(`${KEY_ENV} must decode to 32 bytes`)
  const id = env[KEY_ID_ENV] || VERSION
  if (!/^[A-Za-z0-9._-]{1,32}$/.test(id)) throw new Error(`${KEY_ID_ENV} is invalid`)
  return { value, id }
}

/** Encrypts the complete provider token set; plaintext is not a persistence format. */
export function encryptParasutCredential(value: string, env: NodeJS.ProcessEnv = process.env): string {
  if (!value) throw new Error('Paraşüt credential cannot be empty')
  const current = key(env)
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, current.value, iv)
  cipher.setAAD(AAD)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, current.id, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join(':')
}

/** Decrypts only at the provider worker boundary with the active key. */
export function decryptParasutCredential(envelope: string, env: NodeJS.ProcessEnv = process.env): string {
  const parts = envelope.split(':')
  if (parts.length !== 5 || parts.some(part => !part) || parts[0] !== VERSION) throw new Error('invalid Paraşüt credential envelope')
  const current = key(env)
  if (parts[1] !== current.id) throw new Error('Paraşüt credential key is not active')
  try {
    const iv = decode(parts[2])
    const tag = decode(parts[3])
    const ciphertext = decode(parts[4])
    if (iv.length !== 12 || tag.length !== 16) throw new Error('invalid Paraşüt credential envelope')
    const decipher = createDecipheriv(ALGORITHM, current.value, iv)
    decipher.setAAD(AAD)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  } catch {
    throw new Error('Paraşüt credential authentication failed')
  }
}

export const parasutCredentialEnv = { key: KEY_ENV, keyId: KEY_ID_ENV } as const
