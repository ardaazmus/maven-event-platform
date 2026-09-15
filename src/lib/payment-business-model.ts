export const FIRST_PARTY_PAYMENT_MODEL = Object.freeze({
  merchantOfRecord: 'mavenforms',
  providers: ['stripe', 'iyzico'],
  googlePay: 'provider_hosted_only',
  invoiceModes: ['manual', 'parasut_v4'],
  tenantPayments: 'future_byo_direct_merchant',
  marketplace: 'deferred',
} as const)

type Pay00Evidence = {
  stripeEligibilityConfirmed: boolean
  iyzicoEligibilityConfirmed: boolean
  googlePayEligibilityConfirmed: boolean
  merchantResponsibilitiesConfirmed: boolean
  countryAndCurrenciesConfirmed: boolean
}

type Pay00GateResult = {
  canStartStripe: boolean
  canStartIyzico: boolean
  canStartGooglePay: boolean
  missing: string[]
}

type StripeConditionalCapabilityInput = {
  mode: 'test' | 'live'
  stripeEligibilityConfirmed: boolean
  merchantResponsibilitiesConfirmed: boolean
  countryAndCurrenciesConfirmed: boolean
  globalR10Passed: boolean
}

type StripeConditionalCapabilityResult = {
  status: 'available' | 'deferred'
  canDisplay: boolean
  canMutate: boolean
  reason: 'stripe_eligibility_missing' | 'merchant_responsibilities_missing' | 'country_and_currencies_missing' | 'r10_release_gate' | null
}

type PublicFirstPartyPaymentProviderInput = {
  provider: unknown
  mode: unknown
  connectionProvider: unknown
  connectionMode: unknown
}

type PublicFirstPartyPaymentProviderResult =
  | { ok: true; provider: 'iyzico' }
  | { ok: false; reason: 'provider_deferred' | 'mode_not_allowed' | 'connection_mismatch' }

export function evaluatePay00Gate(evidence: Pay00Evidence): Pay00GateResult {
  const missing: string[] = []

  if (!evidence.stripeEligibilityConfirmed) missing.push('stripe_eligibility')
  if (!evidence.iyzicoEligibilityConfirmed) missing.push('iyzico_eligibility')
  if (!evidence.googlePayEligibilityConfirmed) missing.push('google_pay_eligibility')
  if (!evidence.merchantResponsibilitiesConfirmed) missing.push('merchant_responsibilities')
  if (!evidence.countryAndCurrenciesConfirmed) missing.push('country_and_currencies')

  const commonReady = evidence.merchantResponsibilitiesConfirmed && evidence.countryAndCurrenciesConfirmed

  return {
    canStartStripe: commonReady && evidence.stripeEligibilityConfirmed,
    canStartIyzico: commonReady && evidence.iyzicoEligibilityConfirmed,
    canStartGooglePay: commonReady && evidence.googlePayEligibilityConfirmed,
    missing,
  }
}

/** Binds the V2 public first-party route to the approved iyzico test path. */
export function evaluatePublicFirstPartyPaymentProvider(
  input: PublicFirstPartyPaymentProviderInput,
): PublicFirstPartyPaymentProviderResult {
  if (input.provider !== 'iyzico') return { ok: false, reason: 'provider_deferred' }
  if (input.mode !== 'test') return { ok: false, reason: 'mode_not_allowed' }
  if (input.connectionProvider !== 'iyzico' || input.connectionMode !== 'test') {
    return { ok: false, reason: 'connection_mismatch' }
  }
  return { ok: true, provider: 'iyzico' }
}

/** Keeps Stripe presentation and mutation behind explicit first-party evidence gates. */
export function evaluateStripeConditionalCapability(
  input: StripeConditionalCapabilityInput,
): StripeConditionalCapabilityResult {
  if (!input.stripeEligibilityConfirmed) {
    return { status: 'deferred', canDisplay: false, canMutate: false, reason: 'stripe_eligibility_missing' }
  }
  if (!input.merchantResponsibilitiesConfirmed) {
    return { status: 'deferred', canDisplay: false, canMutate: false, reason: 'merchant_responsibilities_missing' }
  }
  if (!input.countryAndCurrenciesConfirmed) {
    return { status: 'deferred', canDisplay: false, canMutate: false, reason: 'country_and_currencies_missing' }
  }
  if (input.mode === 'live' && !input.globalR10Passed) {
    return { status: 'deferred', canDisplay: false, canMutate: false, reason: 'r10_release_gate' }
  }
  return { status: 'available', canDisplay: true, canMutate: true, reason: null }
}
