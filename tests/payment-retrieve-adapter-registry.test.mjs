import assert from 'node:assert/strict'
import { encryptPaymentCredential } from '../src/lib/payment-credentials.ts'
import { resolvePaymentRetrieveAdapter } from '../src/lib/payment-retrieve-adapter-registry.ts'

const env = {
  MAVENFORMS_PAYMENT_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64url'),
  MAVENFORMS_PAYMENT_ENCRYPTION_KEY_ID: 'test-key',
}

{
  const envelope = encryptPaymentCredential(JSON.stringify({ secretKey: 'sk_test_example' }), env)
  const result = resolvePaymentRetrieveAdapter({ provider: 'stripe', mode: 'test', credentialsEnvelope: envelope, env })

  assert.equal(result.ok, true)
  if (!result.ok) throw new Error(`unexpected resolution failure: ${result.reason}`)
  assert.equal(result.provider, 'stripe')
  assert.equal(result.mode, 'test')
  assert.equal(result.hasCredentials, true)
  assert.equal('credentials' in result, false)
  assert.equal(typeof result.adapter.retrievePayment, 'function')
}

{
  const envelope = encryptPaymentCredential(JSON.stringify({ apiKey: 'api-key', secretKey: 'secret-key' }), env)
  const result = resolvePaymentRetrieveAdapter({ provider: 'stripe', mode: 'test', credentialsEnvelope: envelope, env })

  assert.deepEqual(result, { ok: false, reason: 'credentials_invalid' })
}

{
  const envelope = encryptPaymentCredential(JSON.stringify({ apiKey: 'api-key', secretKey: 'secret-key' }), env)
  const result = resolvePaymentRetrieveAdapter({ provider: 'iyzico', mode: 'test', credentialsEnvelope: envelope, env })

  assert.equal(result.ok, true)
  if (!result.ok) throw new Error(`unexpected resolution failure: ${result.reason}`)
  assert.equal(result.provider, 'iyzico')
  assert.equal(result.mode, 'test')
  assert.equal(result.hasCredentials, true)
  assert.equal('credentials' in result, false)
  assert.equal(typeof result.adapter.retrievePayment, 'function')
}

{
  assert.deepEqual(resolvePaymentRetrieveAdapter({ provider: 'stripe', mode: 'test', credentialsEnvelope: null, env }), { ok: false, reason: 'credentials_missing' })
  assert.deepEqual(resolvePaymentRetrieveAdapter({ provider: 'stripe', mode: 'test', credentialsEnvelope: 'not-an-envelope', env }), { ok: false, reason: 'credentials_invalid' })
}

console.log('payment-retrieve-adapter-registry.test: PASS (PAY-06D-52)')
