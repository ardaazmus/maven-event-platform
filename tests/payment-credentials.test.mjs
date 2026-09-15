import assert from 'node:assert'
import { decryptPaymentCredential, encryptPaymentCredential } from '../src/lib/payment-credentials.ts'

const key = Buffer.alloc(32, 7).toString('base64url')
const env = { MAVENFORMS_PAYMENT_ENCRYPTION_KEY: key, MAVENFORMS_PAYMENT_ENCRYPTION_KEY_ID: 'test-key-1' }
const plaintext = 'provider-secret-must-never-be-stored-in-plain-text'
const envelope = encryptPaymentCredential(plaintext, env)

assert.equal(decryptPaymentCredential(envelope, env), plaintext, 'credential envelope must decrypt with the active key')
assert.notEqual(envelope, plaintext, 'credential envelope must not equal plaintext')
assert(envelope.startsWith('v1:test-key-1:'), 'envelope must carry version and key id')

const parts = envelope.split(':')
parts[4] = `${parts[4].slice(0, -1)}${parts[4].endsWith('A') ? 'B' : 'A'}`
assert.throws(() => decryptPaymentCredential(parts.join(':'), env), /authentication failed/, 'tampered credentials must be rejected')
assert.throws(() => encryptPaymentCredential(plaintext, {}), /MAVENFORMS_PAYMENT_ENCRYPTION_KEY is required/)
assert.throws(() => decryptPaymentCredential(envelope, { ...env, MAVENFORMS_PAYMENT_ENCRYPTION_KEY_ID: 'old-key' }), /not active/)

console.log('payment-credentials.test: PASS (PAY-03A)')
