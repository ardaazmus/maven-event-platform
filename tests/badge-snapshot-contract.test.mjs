import assert from 'node:assert/strict'
import { assertBadgeSnapshotScope, createBadgeSubmissionSnapshot } from '../src/lib/badge-snapshot-contract.ts'

const values = {
  firstName: 'Ada',
  title: 'Konuşmacı',
  email: 'ada@example.test',
  phone: '+90 555 000 00 00',
  paymentAmount: 1250,
  adminNote: 'gizli',
}
const created = createBadgeSubmissionSnapshot({
  snapshotId: 'snapshot-1',
  workspaceId: 'workspace-1',
  formId: 'form-1',
  submissionId: 'submission-1',
  formVersionId: 'published-v2',
  capturedAtMs: 10_000,
  values,
})

assert.equal(created.ok, true)
assert.deepEqual(created.snapshot.values, { firstName: 'Ada', title: 'Konuşmacı' })
assert.equal('email' in created.snapshot.values, false)
assert.equal('phone' in created.snapshot.values, false)
assert.equal('paymentAmount' in created.snapshot.values, false)
assert.equal('answers' in created.snapshot, false)

values.firstName = 'Changed after capture'
assert.equal(created.snapshot.values.firstName, 'Ada')
assert.equal(assertBadgeSnapshotScope(created.snapshot, { workspaceId: 'workspace-1', formId: 'form-1', formVersionId: 'published-v2' }).ok, true)
assert.deepEqual(assertBadgeSnapshotScope(created.snapshot, { workspaceId: 'workspace-1', formId: 'form-1', formVersionId: 'published-v1' }), { ok: false, code: 'SCOPE_MISMATCH' })

assert.deepEqual(createBadgeSubmissionSnapshot({
  snapshotId: 'snapshot-1', workspaceId: 'workspace-1', formId: 'form-1', submissionId: 'submission-1', formVersionId: 'published-v2', capturedAtMs: 10_000, values: { firstName: ['Ada'] },
}), { ok: false, code: 'VALUE_INVALID' })
assert.deepEqual(createBadgeSubmissionSnapshot({
  snapshotId: 'snapshot/1', workspaceId: 'workspace-1', formId: 'form-1', submissionId: 'submission-1', formVersionId: 'published-v2', capturedAtMs: 10_000, values: {},
}), { ok: false, code: 'IDENTIFIER_INVALID' })

console.log('badge-snapshot-contract: all assertions passed')
