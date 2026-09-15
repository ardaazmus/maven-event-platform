import assert from 'node:assert/strict'
import {
  buildParasutEInvoiceInboxRequest,
  lookupParasutEInvoiceInbox,
  parseParasutEInvoiceInboxResponse,
} from '../src/lib/providers/parasut-einvoice-inbox.ts'

const request = buildParasutEInvoiceInboxRequest('12345', 'secret-token', '1234567890')
assert.equal(request.url, 'https://api.parasut.com/v4/12345/e_invoice_inboxes?filter%5Bvkn%5D=1234567890&page%5Bnumber%5D=1&page%5Bsize%5D=25')
assert.equal(request.method, 'GET')
assert.equal(request.headers.authorization, 'Bearer secret-token')
assert.equal(parseParasutEInvoiceInboxResponse({ data: [{ type: 'e_invoice_inboxes', id: '7001' }] })?.found, true)
assert.equal(parseParasutEInvoiceInboxResponse({ data: [] })?.found, false)
assert.equal(parseParasutEInvoiceInboxResponse({ data: [{ type: 'contacts', id: '7001' }] }), null)
assert.equal(parseParasutEInvoiceInboxResponse({ data: [{ type: 'e_invoice_inboxes', id: 'external-7001' }] }), null)
assert.throws(() => buildParasutEInvoiceInboxRequest('12345', 'secret-token', '123456789'))

const found = await lookupParasutEInvoiceInbox(
  { companyId: '12345', taxNumber: '1234567890' },
  'secret-token',
  { get: async (received) => { assert.equal(received.url.includes('filter%5Bvkn%5D=1234567890'), true); return { status: 200, json: { data: [{ type: 'e_invoice_inboxes', id: '7001' }] } } } },
  () => new Date('2026-09-05T12:00:00.000Z'),
)
assert.deepEqual(found, { ok: true, data: { taxNumber: '1234567890', found: true, checkedAt: '2026-09-05T12:00:00.000Z' } })

const notFound = await lookupParasutEInvoiceInbox(
  { companyId: '12345', taxNumber: '1234567890' },
  'secret-token',
  { get: async () => ({ status: 200, json: { data: [] } }) },
  () => new Date('2026-09-05T12:01:00.000Z'),
)
assert.deepEqual(notFound, { ok: true, data: { taxNumber: '1234567890', found: false, checkedAt: '2026-09-05T12:01:00.000Z' } })

const invalidResponse = await lookupParasutEInvoiceInbox(
  { companyId: '12345', taxNumber: '1234567890' },
  'secret-token',
  { get: async () => ({ status: 200, json: { data: [{ type: 'e_invoice_inboxes', id: 'not-numeric' }] } }) },
)
assert.deepEqual(invalidResponse, { ok: false, error: { code: 'parasut_einvoice_response_invalid', kind: 'unknown', providerStatus: 200, retryable: false } })

const authFailure = await lookupParasutEInvoiceInbox(
  { companyId: '12345', taxNumber: '1234567890' },
  'secret-token',
  { get: async () => ({ status: 401 }) },
)
assert.deepEqual(authFailure, { ok: false, error: { code: 'parasut_einvoice_authentication_failed', kind: 'authentication', providerStatus: 401, retryable: false } })

const networkFailure = await lookupParasutEInvoiceInbox(
  { companyId: '12345', taxNumber: '1234567890' },
  'secret-token',
  { get: async () => { throw new Error('network') } },
)
assert.deepEqual(networkFailure, { ok: false, error: { code: 'parasut_einvoice_lookup_unavailable', kind: 'unavailable', providerStatus: null, retryable: true } })

console.log('PASS parasut e-invoice inbox tests')
