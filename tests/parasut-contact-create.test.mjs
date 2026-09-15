import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildParasutContactCreateRequest, resolveParasutContact } from '../src/lib/providers/parasut-contact.ts'
import { persistParasutContactCreateCommand, prepareParasutContactCreateCommand } from '../src/lib/parasut-contact-command.ts'

const source = readFileSync('src/lib/parasut-contact-command.ts', 'utf8')
assert.match(source, /requestFingerprint/)
assert.match(source, /workspaceId_requestFingerprint/)
assert.match(source, /approvedById/)
assert.doesNotMatch(source, /fetch\(/)
assert.doesNotMatch(source, /console\./)

const resolution = resolveParasutContact({ candidates: [], query: { legalName: 'Acme A.Ş.', taxNumber: '1234567890' } })
const base = { workspaceId: 'ws_1', connectionId: 'conn_1', companyId: '123', sourceReference: 'invoice_1', lookupFingerprint: 'lookup-1', resolution, createInput: { legalName: 'Acme A.Ş.', accountType: 'customer' }, accessToken: 'secret-token' }
assert.deepEqual(prepareParasutContactCreateCommand(base), { status: 'approval_required', reason: 'operator_approval_required' })
assert.deepEqual(prepareParasutContactCreateCommand({ ...base, resolution: { status: 'manual_review_required', requiresReview: true, requiresExplicitApproval: false }, approvedById: 'user_1' }), { status: 'approval_required', reason: 'resolution_not_create_required' })

const approved = prepareParasutContactCreateCommand({ ...base, approvedById: 'user_1' })
assert.equal(approved.status, 'approved')
assert.equal(approved.request.url, buildParasutContactCreateRequest('123', 'secret-token', base.createInput).url)
assert.equal(JSON.stringify(approved.command).includes('secret-token'), false, 'persisted command must not contain provider credentials')
assert.equal(approved.command.requestFingerprint.length, 64)

let createCount = 0
const store = {
  findUnique: async () => createCount ? { id: 'cmd_1', status: 'approved' } : null,
  create: async () => { createCount += 1; return { id: 'cmd_1', status: 'approved' } },
}
const first = await persistParasutContactCreateCommand(approved.command, store)
const replay = await persistParasutContactCreateCommand(approved.command, store)
assert.deepEqual(first, { status: 'created', commandId: 'cmd_1' })
assert.deepEqual(replay, { status: 'duplicate', commandId: 'cmd_1' })
assert.equal(createCount, 1)

let raced = false
const raceStore = {
  findUnique: async () => raced ? { id: 'cmd_race', status: 'approved' } : null,
  create: async () => { raced = true; throw new Error('unique constraint') },
}
assert.deepEqual(await persistParasutContactCreateCommand(approved.command, raceStore), { status: 'duplicate', commandId: 'cmd_race' })

console.log('parasut contact create contract tests: PASS')
