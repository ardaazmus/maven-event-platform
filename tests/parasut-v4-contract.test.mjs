import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync('src/lib/providers/parasut-v4.ts', 'utf8')
assert(source.includes('export interface ParasutV4Adapter'), 'Paraşüt v4 adapter interface must exist')
for (const method of ['findOrCreateContact', 'findOrCreateProduct', 'createSalesInvoice', 'lookupEInvoiceInbox', 'formalizeEInvoice', 'formalizeEArchive', 'getTrackableJob', 'downloadInvoicePdf']) {
  assert(source.includes(`${method}(`), `${method} must be part of the adapter contract`)
}
assert(source.includes('companyId'), 'every provider command must be company scoped')
assert(source.includes('idempotencyKey'), 'sales invoice command must carry a local idempotency key')
assert(source.includes('provider_draft_created'), 'draft result must be distinct from issued')
assert(source.includes('formalization_pending'), 'formalization result must remain asynchronous')
assert(source.includes('document_ready'), 'document result must be distinct from job accepted')
assert(source.includes('providerStatus'), 'provider status must be normalized, not raw response')
assert(source.includes('pdfBytes'), 'PDF adapter result must carry backend bytes, not a provider URL')
assert(!source.includes('accessToken'), 'adapter domain contract must not expose access tokens')
assert(!source.includes('refreshToken'), 'adapter domain contract must not expose refresh tokens')
assert(!source.includes('rawResponse'), 'adapter contract must not expose raw provider responses')
assert(!source.includes('providerUrl'), 'adapter contract must not expose temporary provider URLs')

console.log('parasut-v4-contract.test: PASS (INV/F-P-00-01)')
