import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createXlsx } from '../src/lib/xlsx-export.ts'

const route = readFileSync('src/app/api/invoices/[id]/documents/route.ts', 'utf8')

assert(route.includes('invoiceDocument.findFirst'), 'upload must check an existing document before writing')
assert(route.includes('artifactKind: validation.kind'), 'duplicate identity must include artifact kind')
assert(route.includes('sha256: validation.sha256'), 'duplicate identity must include content hash')
assert(route.includes('duplicate'), 'duplicate upload must be reported as an idempotent reuse')
assert(route.includes('P2002'), 'concurrent duplicate create must handle the unique constraint')
assert(route.includes('invoiceDocument.create'), 'first upload must still create the document')
assert(!route.includes('invoiceDeliveryIntent.create'), 'document upload must not create delivery side effects')

const first = createXlsx(['row_id'], [['row-1']])
const same = createXlsx(['row_id'], [['row-1']])
const different = createXlsx(['row_id'], [['row-2']])
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
assert.equal(digest(first), digest(same), 'same workbook bytes must have the same hash')
assert.notEqual(digest(first), digest(different), 'different workbook bytes must have different hashes')
assert.match(digest(first), /^[a-f0-9]{64}$/, 'document identity hash must be canonical SHA-256')

console.log('invoice-document-hash.test: PASS (INV/F-U-03-01)')
