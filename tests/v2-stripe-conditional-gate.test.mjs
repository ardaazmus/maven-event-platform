import assert from 'node:assert/strict'
import { evaluateStripeConditionalCapability } from '../src/lib/payment-business-model.ts'

assert.deepEqual(evaluateStripeConditionalCapability({
  mode: 'test',
  stripeEligibilityConfirmed: false,
  merchantResponsibilitiesConfirmed: true,
  countryAndCurrenciesConfirmed: true,
  globalR10Passed: false,
}), {
  status: 'deferred',
  canDisplay: false,
  canMutate: false,
  reason: 'stripe_eligibility_missing',
})

assert.deepEqual(evaluateStripeConditionalCapability({
  mode: 'test',
  stripeEligibilityConfirmed: true,
  merchantResponsibilitiesConfirmed: true,
  countryAndCurrenciesConfirmed: true,
  globalR10Passed: false,
}), {
  status: 'available',
  canDisplay: true,
  canMutate: true,
  reason: null,
})

assert.deepEqual(evaluateStripeConditionalCapability({
  mode: 'live',
  stripeEligibilityConfirmed: true,
  merchantResponsibilitiesConfirmed: true,
  countryAndCurrenciesConfirmed: true,
  globalR10Passed: false,
}), {
  status: 'deferred',
  canDisplay: false,
  canMutate: false,
  reason: 'r10_release_gate',
})

console.log('v2-stripe-conditional-gate.test: PASS')
