import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/forms/[id]/submissions/[subId]/route.ts', 'utf8')
const deleteSource = route.slice(route.indexOf('export async function DELETE'))

assert(deleteSource.includes('db.$transaction'), 'submission deletion and counter update must share a transaction')
assert(deleteSource.includes('tx.submission.delete'), 'submission deletion must use the transaction client')
assert(deleteSource.includes('tx.form.update'), 'form counter update must use the transaction client')
assert(!deleteSource.includes('await db.submission.delete'), 'submission deletion must not commit separately')
assert(!deleteSource.includes('await db.form.update'), 'form counter update must not commit separately')

console.log('submission-delete-transaction.test: PASS (SUBMISSION-DATA-01)')
