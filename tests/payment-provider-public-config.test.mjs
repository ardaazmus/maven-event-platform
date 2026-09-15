import assert from 'node:assert'
import { sanitizePaymentProviderPublicConfig } from '../src/lib/payment-provider-public-config.ts'

assert.deepStrictEqual(
  sanitizePaymentProviderPublicConfig({
    publishableKey: ' pk_test_123 ',
    merchantId: 'merchant-1',
    accountId: 'acct-1',
  }),
  {
    publishableKey: 'pk_test_123',
    merchantId: 'merchant-1',
    accountId: 'acct-1',
  },
  'approved public provider fields must be preserved and normalized',
)

assert.deepStrictEqual(
  sanitizePaymentProviderPublicConfig({
    publishableKey: 'pk_test_123',
    apiKey: 'server-secret',
    secretKey: 'server-secret',
    webhookSecret: 'whsec_secret',
    credentialsEnvelope: 'encrypted-secret',
    token: 'access-token',
    unknown: 'must-not-leak',
  }),
  { publishableKey: 'pk_test_123' },
  'server credentials and unknown fields must never cross the response boundary',
)

assert.deepStrictEqual(
  sanitizePaymentProviderPublicConfig({
    publishableKey: 'pk_test_123\nInjected-Header',
    merchantId: 42,
    accountId: 'a'.repeat(256),
    secretKey: null,
  }),
  {},
  'invalid, oversized, and header-injection values must be removed',
)

console.log('payment-provider-public-config.test: PASS (PAY-04C)')
