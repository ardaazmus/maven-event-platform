import assert from 'node:assert'
import { decryptEmailCredential, emailCredentialEnv, encryptEmailCredential } from '../src/lib/email-credentials.ts'

const key = Buffer.alloc(32, 9).toString('base64url')
const env = { [emailCredentialEnv.key]: key, [emailCredentialEnv.keyId]: 'email-key-1' }
const plaintext = 'smtp-password-must-never-be-stored-in-plain-text'
const envelope = encryptEmailCredential(plaintext, env)

assert.equal(decryptEmailCredential(envelope, env), plaintext, 'email credential envelope must decrypt with the active key')
assert.notEqual(envelope, plaintext, 'email credential envelope must not equal plaintext')
assert(envelope.startsWith('v1:email-key-1:'), 'envelope must carry version and key id')

const parts = envelope.split(':')
parts[4] = `${parts[4].slice(0, -1)}${parts[4].endsWith('A') ? 'B' : 'A'}`
assert.throws(() => decryptEmailCredential(parts.join(':'), env), /authentication failed/, 'tampered credentials must be rejected')
assert.throws(() => encryptEmailCredential(plaintext, {}), /MAVENFORMS_EMAIL_ENCRYPTION_KEY is required/)
assert.throws(() => decryptEmailCredential(envelope, { ...env, [emailCredentialEnv.keyId]: 'old-key' }), /not active/)

console.log('email-credentials.test: PASS (MAIL-04)')
