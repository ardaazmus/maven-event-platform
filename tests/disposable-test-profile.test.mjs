import assert from 'node:assert/strict'
import { createDisposableTestProfile } from '../src/lib/disposable-test-profile.ts'

const input = {
  environment: 'test',
  databaseName: 'db-run-1',
  objectStorageNamespace: 'objects-run-1',
  mailMode: 'sink',
  mailRecipientDomain: 'test.invalid',
}

assert.deepEqual(createDisposableTestProfile(input), {
  ok: true,
  profile: {
    environment: 'test',
    database: { mode: 'disposable', name: 'db-run-1', resetOnStart: true },
    objectStorage: { mode: 'disposable', namespace: 'objects-run-1', cleanupOnFinish: true },
    mail: { mode: 'sink', recipientDomain: 'test.invalid', externalDelivery: false },
    outboundNetwork: false,
    productionMutation: false,
  },
})
assert.deepEqual(createDisposableTestProfile({ ...input, mailRecipientDomain: 'example.com' }), { ok: false, reason: 'external_mail_forbidden' })
assert.deepEqual(createDisposableTestProfile({ ...input, mailMode: 'smtp' }), { ok: false, reason: 'external_mail_forbidden' })
assert.deepEqual(createDisposableTestProfile({ ...input, environment: 'production' }), { ok: false, reason: 'production_forbidden' })
assert.deepEqual(createDisposableTestProfile({ ...input, apiKey: 'never-accepted' }), { ok: false, reason: 'secret_forbidden' })
assert.deepEqual(createDisposableTestProfile({ ...input, unexpected: true }), { ok: false, reason: 'input_invalid' })
assert.deepEqual(createDisposableTestProfile({ ...input, databaseName: '../live-db' }), { ok: false, reason: 'input_invalid' })

const source = await Bun.file('src/lib/disposable-test-profile.ts').text()
assert.equal(source.includes('fetch('), false)
assert.equal(source.includes('SMTP'), false)

console.log('disposable-test-profile.test: PASS (R10-V4-19)')
