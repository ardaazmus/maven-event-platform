import assert from 'node:assert/strict'
import { resolveAppEnvironment } from '../src/lib/env.ts'
import { evaluateR10LiveMutation } from '../src/lib/r10-scope-gate.ts'
import { readFileSync } from 'node:fs'

assert.equal(resolveAppEnvironment({ NODE_ENV: 'development' }), 'local')
assert.equal(resolveAppEnvironment({ NODE_ENV: 'development', MAVENFORMS_RUNTIME_ENV: 'staging' }), 'staging')
assert.equal(resolveAppEnvironment({ NODE_ENV: 'production' }), 'production')

assert.deepEqual(evaluateR10LiveMutation({ environment: 'local', operation: 'sandbox', liveSecretProvided: false, productionR10Evidence: false }), { allowed: true, reason: 'sandbox_only' })
assert.deepEqual(evaluateR10LiveMutation({ environment: 'staging', operation: 'sandbox', liveSecretProvided: true, productionR10Evidence: false }), { allowed: false, reason: 'non_production_live_secret_forbidden' })
assert.deepEqual(evaluateR10LiveMutation({ environment: 'staging', operation: 'live', liveSecretProvided: true, productionR10Evidence: true }), { allowed: false, reason: 'non_production_live_endpoint_forbidden' })
assert.deepEqual(evaluateR10LiveMutation({ environment: 'production', operation: 'live', liveSecretProvided: true, productionR10Evidence: false }), { allowed: false, reason: 'production_requires_r10_evidence' })
assert.deepEqual(evaluateR10LiveMutation({ environment: 'production', operation: 'live', liveSecretProvided: false, productionR10Evidence: true }), { allowed: false, reason: 'live_secret_required' })
assert.deepEqual(evaluateR10LiveMutation({ environment: 'production', operation: 'live', liveSecretProvided: true, productionR10Evidence: true }), { allowed: true, reason: 'production_evidence_verified' })

const route = readFileSync('src/app/api/payment-provider-connections/route.ts', 'utf8')
assert(route.indexOf('const liveGuard = evaluateR10LiveMutation') < route.indexOf('const credentialsEnvelope = encryptPaymentCredential'), 'live guard must run before credential encryption')
assert(route.includes('resolveAppEnvironment()'), 'API must use server-owned environment')
assert(route.includes('MAVENFORMS_R10_PRODUCTION_EVIDENCE'), 'production live access must require explicit R-10 evidence')

console.log('r10-live-mutation-guard.test: PASS (R10-V4-02)')
