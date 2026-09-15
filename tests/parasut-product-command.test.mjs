import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildParasutProductCreateRequest, resolveParasutProduct } from '../src/lib/providers/parasut-product.ts'
import { executeParasutProductCreateCommand, parasutProductCreateFingerprint, persistParasutProductCreateCommand, prepareParasutProductCreateCommand } from '../src/lib/parasut-product-command.ts'
import { createParasutProductCommandStoreFromClient } from '../src/lib/parasut-product-command-store.ts'

const source = readFileSync('src/lib/parasut-product-command.ts', 'utf8')
assert.match(source, /lookupFingerprint/)
assert.match(source, /approvedById/)
assert.doesNotMatch(source, /fetch\(/)
assert.doesNotMatch(source, /console\./)

const resolution = resolveParasutProduct({ candidates: [], query: { productCode: 'EVENT-01', name: 'Etkinlik kaydı' } })
const base = { workspaceId: 'ws_1', connectionId: 'conn_1', companyId: '123', sourceReference: 'invoice_line_1', lookupFingerprint: 'lookup-1', resolution, createInput: { productCode: 'EVENT-01', name: 'Etkinlik kaydı', unit: 'adet', vatRate: 20, listPrice: 100, currency: 'TRL' }, accessToken: 'secret-token' }
assert.deepEqual(prepareParasutProductCreateCommand(base), { status: 'approval_required', reason: 'operator_approval_required' })
assert.deepEqual(prepareParasutProductCreateCommand({ ...base, resolution: { status: 'manual_review_required', requiresReview: true, requiresExplicitApproval: false }, approvedById: 'user_1' }), { status: 'approval_required', reason: 'resolution_not_create_required' })

const approved = prepareParasutProductCreateCommand({ ...base, approvedById: 'user_1' })
assert.equal(approved.status, 'approved')
assert.equal(approved.request.url, buildParasutProductCreateRequest('123', 'secret-token', base.createInput).url)
assert.equal(JSON.stringify(approved.command).includes('secret-token'), false, 'persisted command must not contain provider credentials')
assert.equal(approved.command.requestFingerprint, parasutProductCreateFingerprint({ ...base, body: approved.request.body }))

let createCount = 0
const store = {
  findUnique: async () => createCount ? { id: 'product_cmd_1', status: 'approved' } : null,
  create: async ({ data }) => { createCount += 1; assert.equal(data.lookupFingerprint, 'lookup-1'); return { id: 'product_cmd_1', status: 'approved' } },
}
assert.deepEqual(await persistParasutProductCreateCommand(approved.command, store), { status: 'created', commandId: 'product_cmd_1' })
assert.deepEqual(await persistParasutProductCreateCommand(approved.command, store), { status: 'duplicate', commandId: 'product_cmd_1' })
assert.equal(createCount, 1)

let raced = false
const raceStore = {
  findUnique: async () => raced ? { id: 'product_cmd_race', status: 'approved' } : null,
  create: async () => { raced = true; throw new Error('unique constraint') },
}
assert.deepEqual(await persistParasutProductCreateCommand(approved.command, raceStore), { status: 'duplicate', commandId: 'product_cmd_race' })

const calls = []
const scopedClient = {
  parasutProductCommand: {
    findUnique: async args => { calls.push(['findUnique', args]); return { id: 'product_cmd_1', status: 'approved' } },
    create: async args => { calls.push(['create', args]); return { id: 'product_cmd_2', status: 'approved' } },
  },
}
const scopedStore = createParasutProductCommandStoreFromClient(scopedClient, { workspaceId: 'ws_1', connectionId: 'conn_1', companyId: '123' })
assert.deepEqual(await scopedStore.findUnique({ where: { workspaceId_requestFingerprint: { workspaceId: 'ws_1', requestFingerprint: 'fp-1' } } }), { id: 'product_cmd_1', status: 'approved' })
await assert.rejects(() => scopedStore.create({ data: { workspaceId: 'ws_other', connectionId: 'conn_1', companyId: '123', sourceReference: 'line_1', lookupFingerprint: 'lookup-1', requestFingerprint: 'fp-1', status: 'approved', approvedById: 'user_1' } }), /scope mismatch/)
assert.equal(calls.length, 1, 'scope mismatch must be rejected before Prisma create')

const executeStore = {
  claimed: 0,
  transitions: [],
  claimApproved: async () => { executeStore.claimed += 1; return { claimed: true } },
  markConfirmed: async (commandId, providerProductId) => executeStore.transitions.push(['confirmed', commandId, providerProductId]),
  markReconciliationRequired: async commandId => executeStore.transitions.push(['reconciliation_required', commandId]),
  markFailed: async commandId => executeStore.transitions.push(['failed', commandId]),
}
const executionInput = { commandId: 'product_cmd_exec', command: approved.command, request: approved.request, currentLookupFingerprint: 'lookup-1', currentResolution: resolution, transport: async () => ({ status: 201, body: { data: { type: 'products', id: '77', attributes: { stock_count: 100 } } } }), store: executeStore }
assert.deepEqual(await executeParasutProductCreateCommand(executionInput), { status: 'confirmed', commandId: 'product_cmd_exec', providerProductId: '77' })
assert.deepEqual(executeStore.transitions, [['confirmed', 'product_cmd_exec', '77']])

let transportCount = 0
assert.deepEqual(await executeParasutProductCreateCommand({ ...executionInput, currentLookupFingerprint: 'stale', transport: async () => { transportCount += 1; return { status: 201, body: {} } } }), { status: 'reconciliation_required', commandId: 'product_cmd_exec', reason: 'stale_lookup' })
assert.equal(transportCount, 0, 'stale lookup must stop before provider call')
assert.deepEqual(await executeParasutProductCreateCommand({ ...executionInput, transport: async () => { throw new Error('timeout') }, store: { ...executeStore, transitions: [], claimApproved: async () => ({ claimed: true }) } }), { status: 'reconciliation_required', commandId: 'product_cmd_exec', reason: 'ambiguous_provider_result' })
assert.deepEqual(await executeParasutProductCreateCommand({ ...executionInput, transport: async () => ({ status: 401, body: { error: 'secret detail' } }), store: { ...executeStore, transitions: [], claimApproved: async () => ({ claimed: true }) } }), { status: 'failed', commandId: 'product_cmd_exec', kind: 'authentication', retryable: false })

console.log('parasut product command contract tests: PASS')
