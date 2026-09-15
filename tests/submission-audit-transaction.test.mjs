import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/forms/[id]/submissions/[subId]/route.ts', 'utf8')
const patchSource = route.slice(route.indexOf('export async function PATCH'), route.indexOf('export async function DELETE'))

assert(patchSource.includes('db.$transaction'), 'submission update and audit must share a transaction')
assert(patchSource.includes('tx.submission.update'), 'submission update must use the transaction client')
assert(patchSource.includes('tx.auditLog.create'), 'audit write must use the transaction client')
assert(!patchSource.includes('const updated = await db.submission.update'), 'submission update must not commit separately')
assert(!patchSource.includes('await db.auditLog.create'), 'audit write must not commit separately')

console.log('submission-audit-transaction.test: PASS (SUBMISSION-AUDIT-01)')
