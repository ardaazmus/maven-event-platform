import assert from 'node:assert/strict'
import {
  buildParasutProductCreateRequest,
  buildParasutProductLookupRequest,
  parseParasutCreatedProductId,
  parseParasutProductCandidates,
  resolveParasutProduct,
} from '../src/lib/providers/parasut-product.ts'

const lookup = buildParasutProductLookupRequest('123', 'secret-token', { productCode: 'EVENT-01', name: 'Kayıt' })
const lookupUrl = new URL(lookup.url)
assert.equal(lookup.method, 'GET')
assert.equal(lookupUrl.pathname, '/v4/123/products')
assert.equal(lookupUrl.searchParams.get('filter[code]'), 'EVENT-01')
assert.equal(lookupUrl.searchParams.get('filter[name]'), 'Kayıt')
assert.equal(lookupUrl.searchParams.get('page[size]'), '25')
assert.equal(lookup.headers.Authorization, 'Bearer secret-token')

assert.throws(() => buildParasutProductLookupRequest('123', 'token', { pageSize: 26 }), /at least one product lookup filter/)
assert.throws(() => buildParasutProductLookupRequest('abc', 'token', { name: 'Kayıt' }), /company id must be numeric/)

const create = buildParasutProductCreateRequest('123', 'secret-token', { productCode: 'EVENT-01', name: 'Etkinlik kaydı', unit: 'adet', vatRate: 20, listPrice: 100, currency: 'TRL', inventoryTracking: false })
const body = JSON.parse(create.body)
assert.equal(create.method, 'POST')
assert.equal(create.url, 'https://api.parasut.com/v4/123/products')
assert.deepEqual(body.data, { type: 'products', attributes: { name: 'Etkinlik kaydı', code: 'EVENT-01', unit: 'adet', currency: 'TRL', vat_rate: 20, list_price: 100, inventory_tracking: false } })
assert.equal(create.body.includes('stock_count'), false, 'read-only stock fields must not be sent')
assert.equal(create.body.includes('created_at'), false, 'read-only audit fields must not be sent')
assert.equal(create.body.includes('secret-token'), false, 'credentials must not be sent in the request body')
assert.throws(() => buildParasutProductCreateRequest('123', 'token', { name: 'x', vatRate: -1 }), /vatRate is invalid/)

const candidates = parseParasutProductCandidates({ data: [
  { type: 'products', id: '12', attributes: { code: 'EVENT-01', name: 'Etkinlik kaydı', unit: 'adet', stock_count: 99 }, included: [{ secret: 'must not escape' }] },
  { type: 'products', id: '12', attributes: { code: 'duplicate', name: 'duplicate' } },
  { type: 'wrong', id: '13', attributes: { code: 'ignored', name: 'ignored' } },
  { type: 'products', id: 'bad', attributes: { code: 'ignored', name: 'ignored' } },
] })
assert.deepEqual(candidates, [{ providerProductId: '12', code: 'EVENT-01', name: 'Etkinlik kaydı', unit: 'adet' }])
assert.equal(JSON.stringify(candidates).includes('secret'), false)
assert.equal(parseParasutCreatedProductId({ data: { type: 'products', id: '99', attributes: { stock_count: 5 } } }), '99')
assert.equal(parseParasutCreatedProductId({ data: { type: 'products', id: 'not-numeric' } }), null)

assert.deepEqual(resolveParasutProduct({ candidates: [{ providerProductId: '12', code: 'EVENT-01', name: 'Etkinlik kaydı', unit: 'adet' }], query: { productCode: 'EVENT-01', name: 'Etkinlik kaydı' } }), { status: 'matched', providerProductId: '12', matchStrategy: 'exact_code', requiresReview: false, requiresExplicitApproval: false })
assert.deepEqual(resolveParasutProduct({ candidates: [{ providerProductId: '12', code: null, name: 'Etkinlik kaydı', unit: 'adet' }], query: { name: 'Etkinlik kaydı' } }), { status: 'manual_review_required', requiresReview: true, requiresExplicitApproval: false })
assert.deepEqual(resolveParasutProduct({ candidates: [], query: { productCode: 'EVENT-02', name: 'Yeni kayıt' } }), { status: 'create_required', requiresReview: true, requiresExplicitApproval: true })

console.log('parasut product contract tests: PASS')
