import assert from 'node:assert/strict'
import { resolveParasutContact } from '../src/lib/providers/parasut-contact.ts'
import { prepareParasutContactCreateCommand } from '../src/lib/parasut-contact-command.ts'
import { runParasutContactCreateWorker } from '../src/lib/parasut-contact-worker.ts'

const source = {
  workspaceId: 'ws_1',
  lookup: { email: 'finance@example.com', accountType: 'customer' },
  createInput: { legalName: 'Acme A.Ş.', accountType: 'customer', email: 'finance@example.com' },
}
const resolution = resolveParasutContact({ candidates: [], query: source.createInput })
const prepared = prepareParasutContactCreateCommand({ workspaceId: 'ws_1', connectionId: 'conn_1', companyId: '123', sourceReference: 'recipient_1', lookupFingerprint: 'lookup-1', resolution, createInput: source.createInput, approvedById: 'user_1', accessToken: 'secret-token' })
assert.equal(prepared.status, 'approved')

let calls = 0
let state = 'approved'
let providerContactId = null
const store = {
  claimApproved: async () => { if (state !== 'approved') return { claimed: false, status: state, providerContactId }; state = 'submitted'; return { claimed: true } },
  markConfirmed: async (_id, id) => { state = 'confirmed'; providerContactId = id },
  markReconciliationRequired: async () => { state = 'reconciliation_required' },
  markFailed: async () => { state = 'failed' },
}
const common = {
  expectedWorkspaceId: 'ws_1', expectedConnectionId: 'conn_1', expectedCompanyId: '123',
  loadCommand: async () => ({ ...prepared.command, id: 'cmd_1' }),
  loadConnection: async () => ({ workspaceId: 'ws_1', companyId: '123', status: 'active', credentialsEnvelope: 'encrypted' }),
  loadSource: async () => source,
  lookup: async (_companyId, token, lookupInput) => { assert.equal(token, 'secret-token'); assert.deepEqual(lookupInput, source.lookup); return { lookupFingerprint: 'lookup-1', candidates: [] } },
  transport: async request => { calls += 1; assert.equal(request.headers.Authorization, 'Bearer secret-token'); return { status: 201, body: { data: { type: 'contacts', id: '987', attributes: { email: 'private provider data' } } } } },
  store,
  decryptCredential: envelope => { assert.equal(envelope, 'encrypted'); return 'secret-token' },
}
assert.deepEqual(await runParasutContactCreateWorker('cmd_1', common), { status: 'confirmed', commandId: 'cmd_1', providerContactId: '987' })
assert.equal(calls, 1)
assert.equal(JSON.stringify(await runParasutContactCreateWorker('missing', { ...common, loadCommand: async () => null })).includes('secret-token'), false)
assert.deepEqual(await runParasutContactCreateWorker('cmd_1', { ...common, expectedCompanyId: '999' }), { status: 'scope_mismatch', commandId: 'cmd_1' })
assert.deepEqual(await runParasutContactCreateWorker('cmd_1', { ...common, loadConnection: async () => ({ workspaceId: 'ws_1', companyId: '123', status: 'revoked', credentialsEnvelope: 'encrypted' }) }), { status: 'connection_unavailable', commandId: 'cmd_1' })
assert.deepEqual(await runParasutContactCreateWorker('cmd_1', { ...common, lookup: async () => ({ lookupFingerprint: 'stale-lookup', candidates: [] }) }), { status: 'reconciliation_required', commandId: 'cmd_1', reason: 'stale_lookup' })
console.log('parasut contact worker contract tests: PASS')
