import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createParasutContactCommandStoreFromClient } from '../src/lib/parasut-contact-command-store.ts'

const source = readFileSync('src/lib/parasut-contact-command-store.ts', 'utf8')
assert.match(source, /createParasutContactCommandStore/)
assert.match(source, /workspaceId: scope\.workspaceId/)
assert.match(source, /connectionId: scope\.connectionId/)
assert.match(source, /companyId: scope\.companyId/)
assert.match(source, /status: 'approved'/)
assert.match(source, /status: 'submitted'/)
assert.match(source, /status: 'confirmed'/)
assert.match(source, /reconciliation_required/)
assert.match(source, /updateMany/)
assert.doesNotMatch(source, /findMany\(\)/)
assert.doesNotMatch(source, /console\./)
assert.doesNotMatch(source, /JSON\.stringify\(.*token/i)

const rows = new Map()
const client = {
  parasutContactCommand: {
    findUnique: async ({ where }) => rows.get(`${where.workspaceId_requestFingerprint.workspaceId}:${where.workspaceId_requestFingerprint.requestFingerprint}`) || null,
    create: async ({ data }) => {
      const row = { id: 'cmd_1', status: data.status, providerContactId: null, ...data }
      rows.set(`${data.workspaceId}:${data.requestFingerprint}`, row)
      return row
    },
    updateMany: async ({ where, data }) => {
      const row = [...rows.values()].find(value => value.id === where.id && value.workspaceId === where.workspaceId && value.connectionId === where.connectionId && value.companyId === where.companyId && value.status === where.status)
      if (!row) return { count: 0 }
      Object.assign(row, data)
      return { count: 1 }
    },
    findFirst: async ({ where }) => [...rows.values()].find(value => value.id === where.id && value.workspaceId === where.workspaceId && value.connectionId === where.connectionId && value.companyId === where.companyId) || null,
  },
}
const store = createParasutContactCommandStoreFromClient(client, { workspaceId: 'ws_1', connectionId: 'conn_1', companyId: '123' })
await store.create({ data: { workspaceId: 'ws_1', connectionId: 'conn_1', companyId: '123', sourceReference: 'invoice_1', requestFingerprint: 'fingerprint', status: 'approved', approvedById: 'user_1' } })
assert.deepEqual(await store.claimApproved('cmd_1'), { claimed: true })
assert.deepEqual(await store.claimApproved('cmd_1'), { claimed: false, status: 'submitted', providerContactId: null })
assert.deepEqual(await store.markConfirmed('cmd_1', '987'), undefined)
assert.deepEqual(await store.claimApproved('cmd_1'), { claimed: false, status: 'confirmed', providerContactId: '987' })
assert.throws(() => createParasutContactCommandStoreFromClient(client, { workspaceId: 'ws_1', connectionId: 'conn_1', companyId: 'not-numeric' }), /scope is invalid/)

console.log('parasut contact store contract tests: PASS')
