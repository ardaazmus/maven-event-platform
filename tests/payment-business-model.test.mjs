import assert from 'node:assert'
import {
  FIRST_PARTY_PAYMENT_MODEL,
  evaluatePay00Gate,
} from '../src/lib/payment-business-model.ts'

assert.deepEqual(FIRST_PARTY_PAYMENT_MODEL, {
  merchantOfRecord: 'mavenforms',
  providers: ['stripe', 'iyzico'],
  googlePay: 'provider_hosted_only',
  invoiceModes: ['manual', 'parasut_v4'],
  tenantPayments: 'future_byo_direct_merchant',
  marketplace: 'deferred',
})

assert.deepEqual(evaluatePay00Gate({
  stripeEligibilityConfirmed: false,
  iyzicoEligibilityConfirmed: false,
  googlePayEligibilityConfirmed: false,
  merchantResponsibilitiesConfirmed: false,
  countryAndCurrenciesConfirmed: false,
}), {
  canStartStripe: false,
  canStartIyzico: false,
  canStartGooglePay: false,
  missing: [
    'stripe_eligibility',
    'iyzico_eligibility',
    'google_pay_eligibility',
    'merchant_responsibilities',
    'country_and_currencies',
  ],
})

assert.deepEqual(evaluatePay00Gate({
  stripeEligibilityConfirmed: true,
  iyzicoEligibilityConfirmed: false,
  googlePayEligibilityConfirmed: false,
  merchantResponsibilitiesConfirmed: true,
  countryAndCurrenciesConfirmed: true,
}), {
  canStartStripe: true,
  canStartIyzico: false,
  canStartGooglePay: false,
  missing: ['iyzico_eligibility', 'google_pay_eligibility'],
})

assert.deepEqual(evaluatePay00Gate({
  stripeEligibilityConfirmed: true,
  iyzicoEligibilityConfirmed: true,
  googlePayEligibilityConfirmed: true,
  merchantResponsibilitiesConfirmed: true,
  countryAndCurrenciesConfirmed: true,
}), {
  canStartStripe: true,
  canStartIyzico: true,
  canStartGooglePay: true,
  missing: [],
})

console.log('payment-business-model.test: PASS (PAY-00)')
