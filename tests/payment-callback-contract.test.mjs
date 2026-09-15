import assert from 'node:assert'
import { buildPublicPaymentCallbackUrl } from '../src/lib/payment-callback-contract.ts'

assert.deepEqual(buildPublicPaymentCallbackUrl({ appOrigin: 'https://forms.example.test', slug: 'tech-summit-2026', mode: 'live' }), {
  ok: true,
  callbackUrl: 'https://forms.example.test/api/public/forms/tech-summit-2026/payment-callback',
})

assert.deepEqual(buildPublicPaymentCallbackUrl({ appOrigin: 'https://forms.example.test', slug: 'tech-summit-2026', mode: 'live', publicKey: 'pk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }), {
  ok: true,
  callbackUrl: 'https://forms.example.test/api/public/forms/tech-summit-2026/payment-callback?receipt=pk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
})

assert.deepEqual(buildPublicPaymentCallbackUrl({ appOrigin: 'http://localhost:3000', slug: 'tech-summit-2026', mode: 'test' }), {
  ok: true,
  callbackUrl: 'http://localhost:3000/api/public/forms/tech-summit-2026/payment-callback',
})

assert.deepEqual(buildPublicPaymentCallbackUrl({ appOrigin: 'http://attacker.example', slug: 'tech-summit-2026', mode: 'live' }), { ok: false, reason: 'origin_invalid' })
assert.deepEqual(buildPublicPaymentCallbackUrl({ appOrigin: 'https://forms.example.test', slug: '../other', mode: 'test' }), { ok: false, reason: 'slug_invalid' })
assert.deepEqual(buildPublicPaymentCallbackUrl({ appOrigin: 'https://forms.example.test/path', slug: 'tech-summit-2026', mode: 'live' }), { ok: false, reason: 'origin_invalid' })
assert.deepEqual(buildPublicPaymentCallbackUrl({ appOrigin: 'https://forms.example.test', slug: 'tech-summit-2026', mode: 'live', publicKey: 'po_internal' }), { ok: false, reason: 'public_key_invalid' })

console.log('payment-callback-contract.test: PASS (PAY-06D-15)')
