import assert from 'node:assert'
import { validateIyzicoBuyer } from '../src/lib/iyzico-buyer-contract.ts'

assert.deepEqual(validateIyzicoBuyer({
  id: 'buyer_123', name: 'Ada', surname: 'Test', email: 'ada@example.test', gsmNumber: '+905551112233',
  registrationAddress: 'Test Mah. 1', city: 'Istanbul', country: 'Turkey', zipCode: '34000', ip: '203.0.113.10',
}), {
  ok: true,
  buyer: {
    id: 'buyer_123', name: 'Ada', surname: 'Test', email: 'ada@example.test', gsmNumber: '+905551112233',
    registrationAddress: 'Test Mah. 1', city: 'Istanbul', country: 'Turkey', zipCode: '34000', ip: '203.0.113.10',
  },
})

assert.deepEqual(validateIyzicoBuyer({ id: 'buyer_123', name: 'Ada', surname: 'Test' }), { ok: false, reason: 'email_invalid' })
assert.deepEqual(validateIyzicoBuyer({ id: 'buyer_123', name: 'Ada', surname: 'Test', email: 'ada@example.test', cardNumber: '4111111111111111' }), { ok: false, reason: 'forbidden_field' })

console.log('iyzico-buyer-contract.test: PASS (PAY-06D-12)')
