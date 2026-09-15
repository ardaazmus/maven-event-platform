import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { evaluateR10LiveMutation } from '../src/lib/r10-scope-gate.ts'

const localLive = evaluateR10LiveMutation({ environment: 'local', operation: 'live', liveSecretProvided: true, productionR10Evidence: true })
const stagingLive = evaluateR10LiveMutation({ environment: 'staging', operation: 'live', liveSecretProvided: true, productionR10Evidence: true })
const productionWithoutEvidence = evaluateR10LiveMutation({ environment: 'production', operation: 'live', liveSecretProvided: true, productionR10Evidence: false })
const productionWithoutSecret = evaluateR10LiveMutation({ environment: 'production', operation: 'live', liveSecretProvided: false, productionR10Evidence: true })

assert.deepEqual(localLive, { allowed: false, reason: 'non_production_live_endpoint_forbidden' })
assert.deepEqual(stagingLive, { allowed: false, reason: 'non_production_live_endpoint_forbidden' })
assert.deepEqual(productionWithoutEvidence, { allowed: false, reason: 'production_requires_r10_evidence' })
assert.deepEqual(productionWithoutSecret, { allowed: false, reason: 'live_secret_required' })

const paymentRoute = readFileSync('src/app/api/payment-provider-connections/route.ts', 'utf8')
assert(paymentRoute.includes("process.env.PAYMENT_LIVE_ENABLED !== 'true'"), 'live feature flag must remain closed by default')
assert(paymentRoute.indexOf('const liveGuard = evaluateR10LiveMutation') < paymentRoute.indexOf('const credentialsEnvelope = encryptPaymentCredential'), 'guard must precede credential persistence')

for (const routePath of [
  'src/app/api/invoices/import/route.ts',
  'src/app/api/invoices/export/route.ts',
  'src/app/api/invoices/[id]/documents/[documentId]/ready/route.ts',
]) {
  const source = readFileSync(routePath, 'utf8')
  assert.equal(source.includes('STRIPE_SECRET'), false, `${routePath} must not consume provider secret directly`)
  assert.equal(source.includes('PAYMENT_LIVE_ENABLED'), false, `${routePath} must not open live payment mutation`)
}

console.log('r10-production-guard-integration.test: PASS (R10-V4-23)')
