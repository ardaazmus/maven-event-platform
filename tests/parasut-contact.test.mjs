import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildParasutContactCreateRequest,
  buildParasutContactLookupRequest,
  parseParasutContactCandidates,
  resolveParasutContact,
} from '../src/lib/providers/parasut-contact.ts'

const source = readFileSync('src/lib/providers/parasut-contact.ts', 'utf8')
assert.match(source, /api\.parasut\.com\/v4/)
assert.match(source, /contacts/)
assert.match(source, /account_type/)
assert.match(source, /requiresExplicitApproval/)
assert.doesNotMatch(source, /auto.*create/i)

const lookup = buildParasutContactLookupRequest('123', 'access-token', { taxNumber: '1234567890', accountType: 'customer', pageSize: 25 })
const lookupUrl = new URL(lookup.url)
assert.equal(lookupUrl.pathname, '/v4/123/contacts')
assert.equal(lookupUrl.searchParams.get('filter[tax_number]'), '1234567890')
assert.equal(lookupUrl.searchParams.get('filter[account_type]'), 'customer')
assert.equal(lookupUrl.searchParams.get('page[size]'), '25')
assert.equal(lookup.headers.Authorization, 'Bearer access-token')
assert.equal(lookup.headers.Accept, 'application/vnd.api+json')
assert.throws(() => buildParasutContactLookupRequest('123', 'access-token', {}), /lookup filter/)
assert.throws(() => buildParasutContactLookupRequest('company', 'access-token', { name: 'Acme' }), /company id/)

const create = buildParasutContactCreateRequest('123', 'access-token', { legalName: 'Acme A.Ş.', accountType: 'customer', email: 'finance@example.com', taxNumber: '1234567890' })
assert.equal(create.method, 'POST')
assert.equal(create.headers['Content-Type'], 'application/vnd.api+json')
assert.deepEqual(JSON.parse(create.body), { data: { type: 'contacts', attributes: { name: 'Acme A.Ş.', account_type: 'customer', email: 'finance@example.com', tax_number: '1234567890' } } })

const candidates = parseParasutContactCandidates({ data: [
  { type: 'contacts', id: '9', attributes: { name: 'Acme A.Ş.', email: 'finance@example.com', tax_number: '1234567890', archived: false, balance: 99 } },
  { type: 'contacts', id: '9', attributes: { name: 'duplicate' } },
  { type: 'products', id: '7', attributes: { name: 'ignored' } },
  { type: 'contacts', id: 'bad', attributes: { name: 'ignored' } },
] })
assert.deepEqual(candidates, [{ providerContactId: '9', name: 'Acme A.Ş.', email: 'finance@example.com', taxNumber: '1234567890', accountType: null }])

assert.deepEqual(resolveParasutContact({ candidates, query: { taxNumber: '1234567890', email: 'finance@example.com', legalName: 'Acme A.Ş.' } }), { status: 'matched', providerContactId: '9', matchStrategy: 'exact_tax_number', requiresReview: false, requiresExplicitApproval: false })
assert.deepEqual(resolveParasutContact({ candidates: [], query: { legalName: 'Acme A.Ş.', email: 'finance@example.com' } }), { status: 'create_required', requiresReview: true, requiresExplicitApproval: true })
assert.deepEqual(resolveParasutContact({ candidates: [{ ...candidates[0], providerContactId: '10' }], query: { name: 'Acme A.Ş.' } }), { status: 'manual_review_required', requiresReview: true, requiresExplicitApproval: false })

console.log('parasut contact contract tests: PASS')
