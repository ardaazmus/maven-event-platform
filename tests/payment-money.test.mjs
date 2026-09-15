import assert from 'node:assert'
import { assertPaymentAmount, normalizePaymentCurrency, parsePaymentAmount, paymentCurrencyExponent } from '../src/lib/payment-money.ts'

assert.equal(normalizePaymentCurrency(' try '), 'TRY')
assert.equal(normalizePaymentCurrency('CAD'), null)
assert.equal(paymentCurrencyExponent('JPY'), 0)
assert.equal(parsePaymentAmount('125.50', 'TRY'), 12550)
assert.equal(parsePaymentAmount('125.5', 'TRY'), 12550)
assert.equal(parsePaymentAmount('125.5', 'JPY'), null)
assert.equal(parsePaymentAmount('125', 'JPY'), 125)
assert.equal(parsePaymentAmount('0', 'TRY'), null)
assert.equal(parsePaymentAmount('1.001', 'TRY'), null)
assert.equal(parsePaymentAmount('1e2', 'TRY'), null)
assert.equal(parsePaymentAmount('999999999999999999999', 'TRY'), null)
assert.equal(assertPaymentAmount(12550), 12550)
assert.throws(() => assertPaymentAmount(0), /payment_amount_invalid/)
assert.throws(() => assertPaymentAmount(1.2), /payment_amount_invalid/)

console.log('payment-money.test: PASS (PAY-03A)')
