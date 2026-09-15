import assert from 'node:assert'
import { calculatePublishedPayment } from '../src/lib/payment-pricing.ts'

assert.deepEqual(calculatePublishedPayment({
  type: 'fixed',
  amount: '125.50',
  currency: 'TRY',
}, {}, '999999.99'), {
  ok: true,
  amountMinor: 12550,
  currency: 'TRY',
})

assert.deepEqual(calculatePublishedPayment({
  type: 'field',
  fieldKey: 'ticket_price',
  currency: 'EUR',
}, { ticket_price: '40.00' }), {
  ok: true,
  amountMinor: 4000,
  currency: 'EUR',
})

assert.deepEqual(calculatePublishedPayment({
  type: 'field',
  fieldKey: 'ticket_price',
  currency: 'EUR',
}, { ticket_price: 40 }), {
  ok: false,
  reason: 'field_value_invalid',
})

assert.deepEqual(calculatePublishedPayment({
  type: 'price_table',
  fieldKey: 'ticket_type',
  currency: 'TRY',
  prices: { standard: '100', vip: '250' },
}, { ticket_type: 'vip' }), {
  ok: true,
  amountMinor: 25000,
  currency: 'TRY',
})

assert.deepEqual(calculatePublishedPayment({
  type: 'price_table',
  fieldKey: 'ticket_type',
  currency: 'TRY',
  prices: { standard: '100' },
}, { ticket_type: 'unknown' }), {
  ok: false,
  reason: 'price_selection_invalid',
})

assert.deepEqual(calculatePublishedPayment({
  type: 'fixed',
  amount: '100.001',
  currency: 'TRY',
}, {}), {
  ok: false,
  reason: 'amount_invalid',
})

console.log('payment-pricing.test: PASS (PAY-03B)')
