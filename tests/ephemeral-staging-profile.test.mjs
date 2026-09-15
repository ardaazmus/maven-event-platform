import assert from 'node:assert/strict'
import { createEphemeralStagingProfile } from '../src/lib/ephemeral-staging-profile.ts'

const input = {
  environment: 'staging',
  deploymentId: 'smoke-20260911',
  namespace: 'mavenforms-smoke',
  databaseMode: 'ephemeral',
  objectStorageMode: 'ephemeral',
  mailMode: 'sink',
  recipientDomain: 'test.invalid',
  liveSecretProvided: false,
  providerMutation: 'sandbox_only',
  cleanupConfirmed: true,
}

assert.deepEqual(createEphemeralStagingProfile(input), {
  ok: true,
  profile: {
    environment: 'staging',
    deploymentId: input.deploymentId,
    namespace: input.namespace,
    databaseMode: 'ephemeral',
    objectStorageMode: 'ephemeral',
    mailMode: 'sink',
    recipientDomain: 'test.invalid',
    providerMutation: 'sandbox_only',
    outboundNetwork: false,
    productionMutation: false,
    persistentData: false,
    cleanupConfirmed: true,
  },
})
assert.deepEqual(createEphemeralStagingProfile({ ...input, environment: 'production' }), { ok: false, reason: 'production_forbidden' })
assert.deepEqual(createEphemeralStagingProfile({ ...input, liveSecretProvided: true }), { ok: false, reason: 'live_secret_forbidden' })
assert.deepEqual(createEphemeralStagingProfile({ ...input, databaseMode: 'persistent' }), { ok: false, reason: 'persistent_mode_forbidden' })
assert.deepEqual(createEphemeralStagingProfile({ ...input, recipientDomain: 'example.com' }), { ok: false, reason: 'external_delivery_forbidden' })
assert.deepEqual(createEphemeralStagingProfile({ ...input, mailMode: 'smtp' }), { ok: false, reason: 'external_delivery_forbidden' })
assert.deepEqual(createEphemeralStagingProfile({ ...input, deploymentId: '../prod' }), { ok: false, reason: 'unsafe_identifier' })
assert.deepEqual(createEphemeralStagingProfile({ ...input, cleanupConfirmed: false }), { ok: false, reason: 'cleanup_required' })
assert.deepEqual(createEphemeralStagingProfile({ ...input, apiKey: 'never-accepted' }), { ok: false, reason: 'input_invalid' })

const source = await Bun.file('src/lib/ephemeral-staging-profile.ts').text()
assert.equal(source.includes('fetch('), false)
assert.equal(source.includes('db.'), false)
assert.equal(source.includes('SMTP'), false)

console.log('ephemeral-staging-profile.test: PASS (R10-V4-22)')
