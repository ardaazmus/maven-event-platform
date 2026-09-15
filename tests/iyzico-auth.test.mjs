import assert from 'node:assert'
import { createIyzicoAuthorization } from '../src/lib/iyzico-auth.ts'

const body = JSON.stringify({ conversationId: 'order_test_123456', price: '125.50' })
const result = createIyzicoAuthorization({
  apiKey: 'api-key',
  secretKey: 'secret-key',
  randomKey: '123456789',
  path: '/payment/iyzipos/checkoutform/initialize/auth/ecom',
  body,
})

assert.equal(result.ok, true)
assert.equal(result.headers['x-iyzi-rnd'], '123456789')
assert.equal(result.headers['Content-Type'], 'application/json')
assert.match(result.headers.Authorization, /^IYZWSv2 [A-Za-z0-9+/=]+$/)
assert.equal(Buffer.from(result.headers.Authorization.slice('IYZWSv2 '.length), 'base64').toString('utf8'), 'apiKey:api-key&randomKey:123456789&signature:217a712b4312939d0afcc0686943cc1b901340c81ff4c7a11c0ff710927ac7d6')

assert.deepEqual(createIyzicoAuthorization({ apiKey: 'api-key', secretKey: 'secret-key', randomKey: '123', path: 'https://api.iyzipay.com/payment', body: '{}' }), { ok: false, reason: 'path_invalid' })
assert.deepEqual(createIyzicoAuthorization({ apiKey: 'api-key', secretKey: 'secret-key', randomKey: '123', path: '/payment', body: '{"secretKey":"no"}' }), { ok: false, reason: 'body_forbidden' })

console.log('iyzico-auth.test: PASS (PAY-06D-09)')
