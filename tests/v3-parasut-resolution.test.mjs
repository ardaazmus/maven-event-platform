import assert from 'node:assert/strict'
import { prepareParasutContactCreateCommand } from '../src/lib/parasut-contact-command.ts'
import { prepareParasutProductCreateCommand } from '../src/lib/parasut-product-command.ts'
import {
  buildParasutContactLookupRequest,
  parseParasutContactCandidates,
  resolveParasutContact,
} from '../src/lib/providers/parasut-contact.ts'
import {
  buildParasutProductLookupRequest,
  parseParasutProductCandidates,
  resolveParasutProduct,
} from '../src/lib/providers/parasut-product.ts'

const contactLookup = buildParasutContactLookupRequest('12345', 'token-fixture', {
  taxNumber: 'fixture-tax-123',
  email: 'fixture@example.test',
  page: 1,
  pageSize: 25,
})
assert.equal(contactLookup.method, 'GET')
assert.match(contactLookup.url, /\/12345\/contacts\?/) 
assert.match(contactLookup.url, /filter%5Btax_number%5D=fixture-tax-123/)
assert.equal(contactLookup.url.includes('client_secret'), false)

const contactCandidates = parseParasutContactCandidates({
  data: [
    { type: 'contacts', id: '101', attributes: { name: 'Fixture Company', email: 'fixture@example.test', tax_number: 'fixture-tax-123', account_type: 'customer' } },
    { type: 'contacts', id: '101', attributes: { name: 'duplicate' } },
    { type: 'unexpected', id: '999', attributes: { name: 'ignored' } },
  ],
})
assert.deepEqual(contactCandidates, [{ providerContactId: '101', name: 'Fixture Company', email: 'fixture@example.test', taxNumber: 'fixture-tax-123', accountType: 'customer' }])
assert.deepEqual(
  resolveParasutContact({ candidates: contactCandidates, query: { taxNumber: 'FIXTURE-TAX-123' } }),
  { status: 'matched', providerContactId: '101', matchStrategy: 'exact_tax_number', requiresReview: false, requiresExplicitApproval: false },
)
assert.deepEqual(
  resolveParasutContact({ candidates: [contactCandidates[0], { ...contactCandidates[0], providerContactId: '102' }], query: { taxNumber: 'fixture-tax-123' } }),
  { status: 'manual_review_required', requiresReview: true, requiresExplicitApproval: false },
)
const contactCreateResolution = resolveParasutContact({ candidates: [], query: { taxNumber: 'fixture-tax-123', legalName: 'Fixture Company' } })
assert.deepEqual(contactCreateResolution, { status: 'create_required', requiresReview: true, requiresExplicitApproval: true })
assert.deepEqual(
  prepareParasutContactCreateCommand({
    workspaceId: 'workspace-fixture',
    connectionId: 'connection-fixture',
    companyId: '12345',
    sourceReference: 'submission-fixture',
    lookupFingerprint: 'lookup-fingerprint-fixture',
    resolution: contactCreateResolution,
    createInput: { legalName: 'Fixture Company', accountType: 'customer', taxNumber: 'fixture-tax-123' },
    accessToken: 'token-fixture',
  }),
  { status: 'approval_required', reason: 'operator_approval_required' },
)

const productLookup = buildParasutProductLookupRequest('12345', 'token-fixture', { productCode: 'fixture-product', page: 1, pageSize: 25 })
assert.equal(productLookup.method, 'GET')
assert.match(productLookup.url, /\/12345\/products\?/)
assert.match(productLookup.url, /filter%5Bcode%5D=fixture-product/)
const productCandidates = parseParasutProductCandidates({
  data: [{ type: 'products', id: '201', attributes: { code: 'fixture-product', name: 'Fixture Ticket', unit: 'unit' } }],
})
assert.deepEqual(productCandidates, [{ providerProductId: '201', code: 'fixture-product', name: 'Fixture Ticket', unit: 'unit' }])
const productMatched = resolveParasutProduct({ candidates: productCandidates, query: { productCode: 'FIXTURE-PRODUCT' } })
assert.deepEqual(productMatched, { status: 'matched', providerProductId: '201', matchStrategy: 'exact_code', requiresReview: false, requiresExplicitApproval: false })
const productCreateResolution = resolveParasutProduct({ candidates: [], query: { name: 'Fixture Ticket' } })
assert.deepEqual(productCreateResolution, { status: 'create_required', requiresReview: true, requiresExplicitApproval: true })
const preparedProduct = prepareParasutProductCreateCommand({
  workspaceId: 'workspace-fixture',
  connectionId: 'connection-fixture',
  companyId: '12345',
  sourceReference: 'payment-fixture',
  lookupFingerprint: 'lookup-fingerprint-fixture',
  resolution: productCreateResolution,
  createInput: { name: 'Fixture Ticket', productCode: 'fixture-product', unit: 'unit', vatRate: 2000, currency: 'TRL' },
  approvedById: 'operator-fixture',
  accessToken: 'token-fixture',
})
assert.equal(preparedProduct.status, 'approved')
assert.equal(preparedProduct.command.status, 'approved')
assert.equal(preparedProduct.request.method, 'POST')
assert.equal(preparedProduct.request.url, 'https://api.parasut.com/v4/12345/products')

console.log('v3-parasut-resolution.test: PASS (lookup and create preparation only)')
