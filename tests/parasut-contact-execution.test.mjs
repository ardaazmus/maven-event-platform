import assert from 'node:assert/strict'
import { resolveParasutContact } from '../src/lib/providers/parasut-contact.ts'
import { executeParasutContactCreateCommand, prepareParasutContactCreateCommand } from '../src/lib/parasut-contact-command.ts'

const resolution = resolveParasutContact({ candidates: [], query: { legalName: 'Acme A.Ş.', email: 'finance@example.com' } })
const prepared = prepareParasutContactCreateCommand({
  workspaceId: 'ws_1',
  connectionId: 'conn_1',
  companyId: '123',
  sourceReference: 'invoice_1',
  lookupFingerprint: 'lookup-1',
  resolution,
  createInput: { legalName: 'Acme A.Ş.', accountType: 'customer', email: 'finance@example.com' },
  approvedById: 'user_1',
  accessToken: 'secret-token',
})
assert.equal(prepared.status, 'approved')

let state = 'approved'
let confirmedId = null
let transportCount = 0
const store = {
  claimApproved: async () => {
    if (state !== 'approved') return { claimed: false, status: state, providerContactId: confirmedId }
    state = 'submitted'
    return { claimed: true }
  },
  markConfirmed: async (_commandId, providerContactId) => { state = 'confirmed'; confirmedId = providerContactId },
  markReconciliationRequired: async () => { state = 'reconciliation_required' },
  markFailed: async () => { state = 'failed' },
}
const success = await executeParasutContactCreateCommand({
  commandId: 'cmd_1',
  command: prepared.command,
  request: prepared.request,
  currentLookupFingerprint: 'lookup-1',
  currentResolution: resolution,
  transport: async request => {
    transportCount += 1
    assert.equal(request.method, 'POST')
    assert.equal(request.headers.Authorization, 'Bearer secret-token')
    return { status: 201, body: { data: { type: 'contacts', id: '987', attributes: { name: 'ignored from response' } } } }
  },
  store,
})
assert.deepEqual(success, { status: 'confirmed', commandId: 'cmd_1', providerContactId: '987' })
assert.equal(transportCount, 1)
assert.equal(state, 'confirmed')

const replay = await executeParasutContactCreateCommand({
  commandId: 'cmd_1', command: prepared.command, request: prepared.request, currentLookupFingerprint: 'lookup-1', currentResolution: resolution,
  transport: async () => { throw new Error('provider must not be called on replay') }, store,
})
assert.deepEqual(replay, { status: 'duplicate', commandId: 'cmd_1', providerContactId: '987' })

const stale = await executeParasutContactCreateCommand({
  commandId: 'cmd_stale', command: prepared.command, request: prepared.request, currentLookupFingerprint: 'lookup-new', currentResolution: resolution,
  transport: async () => { throw new Error('stale command must not call provider') }, store: { ...store, claimApproved: async () => { throw new Error('stale command must not claim') } },
})
assert.deepEqual(stale, { status: 'reconciliation_required', commandId: 'cmd_stale', reason: 'stale_lookup' })

state = 'approved'
const timeout = await executeParasutContactCreateCommand({
  commandId: 'cmd_timeout', command: { ...prepared.command, requestFingerprint: prepared.command.requestFingerprint }, request: prepared.request,
  currentLookupFingerprint: 'lookup-1', currentResolution: resolution,
  transport: async () => { throw new Error('network timeout') }, store,
})
assert.deepEqual(timeout, { status: 'reconciliation_required', commandId: 'cmd_timeout', reason: 'ambiguous_provider_result' })
assert.equal(state, 'reconciliation_required')

state = 'approved'
const authFailure = await executeParasutContactCreateCommand({
  commandId: 'cmd_auth', command: prepared.command, request: prepared.request, currentLookupFingerprint: 'lookup-1', currentResolution: resolution,
  transport: async () => ({ status: 401, body: { errors: [{ detail: 'secret provider detail' }] } }), store,
})
assert.deepEqual(authFailure, { status: 'failed', commandId: 'cmd_auth', kind: 'authentication', retryable: false })
assert.equal(state, 'failed')

assert.equal(JSON.stringify(authFailure).includes('secret provider detail'), false)
console.log('parasut contact execution contract tests: PASS')
