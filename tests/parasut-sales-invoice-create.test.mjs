import assert from 'node:assert/strict'
import { buildParasutSalesInvoicePayload } from '../src/lib/providers/parasut-v4-mappers.ts'
import {
  buildParasutSalesInvoiceCreateRequest,
  buildParasutSalesInvoiceLookupRequest,
  executeParasutSalesInvoiceDraft,
  parseParasutCreatedSalesInvoiceId,
  parseParasutReconciledSalesInvoiceId,
} from '../src/lib/parasut-sales-invoice-create.ts'

const mapped = buildParasutSalesInvoicePayload({
  workspaceId: 'workspace-1',
  paymentOrderId: 'payment-1',
  paymentOrderStatus: 'succeeded',
  invoiceState: 'paid_ready_for_invoicing',
  contactId: '1001',
  lines: [{ lineNumber: 1, description: 'Kayıt ücreti', quantity: '1', unitPriceMinor: 10000, taxRateBps: 2000, taxAmountMinor: 2000, lineTotalMinor: 12000, currency: 'TRL', providerProductId: '2001' }],
  currency: 'TRL',
  totalMinor: 12000,
  issueDate: '2026-09-05',
})
assert.equal(mapped.ok, true)

const request = buildParasutSalesInvoiceCreateRequest('12345', 'token-only-in-memory', mapped)
assert.equal(request.url, 'https://api.parasut.com/v4/12345/sales_invoices')
assert.equal(request.method, 'POST')
assert.equal(request.headers.authorization, 'Bearer token-only-in-memory')
assert.equal(request.headers['content-type'], 'application/vnd.api+json')
assert.equal(request.body.includes('token-only-in-memory'), false)
assert.equal(request.body.includes('{{company_id}}'), false)

const mappedWithInvoiceId = buildParasutSalesInvoicePayload({
  workspaceId: 'workspace-1',
  paymentOrderId: 'payment-2',
  paymentOrderStatus: 'succeeded',
  invoiceState: 'paid_ready_for_invoicing',
  contactId: '1001',
  lines: [{ lineNumber: 1, description: 'Kayıt ücreti', quantity: '1', unitPriceMinor: 10000, taxRateBps: 2000, taxAmountMinor: 2000, lineTotalMinor: 12000, currency: 'TRL', providerProductId: '2001' }],
  currency: 'TRL',
  totalMinor: 12000,
  issueDate: '2026-09-05',
  invoiceId: 9876,
})
assert.equal(mappedWithInvoiceId.ok, true)
const lookupRequest = buildParasutSalesInvoiceLookupRequest('12345', 'secret', mappedWithInvoiceId)
assert.equal(lookupRequest?.url, 'https://api.parasut.com/v4/12345/sales_invoices?filter%5Binvoice_id%5D=9876&page%5Bsize%5D=25')

assert.equal(parseParasutCreatedSalesInvoiceId({ data: { type: 'sales_invoices', id: '3001' } }), '3001')
assert.equal(parseParasutCreatedSalesInvoiceId({ data: { type: 'contacts', id: '3001' } }), null)
assert.equal(parseParasutCreatedSalesInvoiceId({ data: { type: 'sales_invoices', id: 'invoice-3001' } }), null)
assert.equal(parseParasutReconciledSalesInvoiceId({ data: [{ type: 'sales_invoices', id: '3001' }] }), '3001')
assert.equal(parseParasutReconciledSalesInvoiceId({ data: [{ type: 'sales_invoices', id: '3001' }, { type: 'sales_invoices', id: '3002' }] }), null)

function createStore() {
  const state = { value: 'queued', providerInvoiceId: null, claims: 0, transitions: [] }
  return {
    state,
    async claimQueued() {
      if (state.value !== 'queued') return { claimed: false, state: state.value, providerInvoiceId: state.providerInvoiceId }
      state.value = 'provider_draft_submitting'
      state.claims += 1
      state.transitions.push('claim')
      return { claimed: true }
    },
    async markDraftCreated(_id, providerInvoiceId) {
      state.value = 'provider_draft_created'
      state.providerInvoiceId = providerInvoiceId
      state.transitions.push('confirmed')
    },
    async markReconciliationRequired() {
      state.value = 'reconciliation_required'
      state.transitions.push('reconciliation')
    },
    async markProviderError() {
      state.value = 'provider_error'
      state.transitions.push('error')
    },
  }
}

const confirmedStore = createStore()
const confirmed = await executeParasutSalesInvoiceDraft(
  { workspaceId: 'workspace-1', invoiceRecordId: 'invoice-1', companyId: '12345', accessToken: 'secret', mappedPayload: mapped, expectedRequestFingerprint: mapped.requestFingerprint },
  confirmedStore,
  { post: async (received) => { assert.equal(received.url, request.url); return { status: 201, json: { data: { type: 'sales_invoices', id: '3001' } } } } },
)
assert.deepEqual(confirmed, { status: 'provider_draft_created', providerInvoiceId: '3001', duplicate: false })
assert.deepEqual(confirmedStore.state.transitions, ['claim', 'confirmed'])

const timeoutStore = createStore()
const timeout = await executeParasutSalesInvoiceDraft(
  { workspaceId: 'workspace-1', invoiceRecordId: 'invoice-2', companyId: '12345', accessToken: 'secret', mappedPayload: mapped, expectedRequestFingerprint: mapped.requestFingerprint },
  timeoutStore,
  { post: async () => { throw new Error('timeout') } },
)
assert.deepEqual(timeout, { status: 'reconciliation_required', reason: 'transport_timeout' })
assert.equal(timeoutStore.state.value, 'reconciliation_required')

const reconciledStore = createStore()
const reconciled = await executeParasutSalesInvoiceDraft(
  { workspaceId: 'workspace-1', invoiceRecordId: 'invoice-5', companyId: '12345', accessToken: 'secret', mappedPayload: mappedWithInvoiceId, expectedRequestFingerprint: mappedWithInvoiceId.requestFingerprint },
  reconciledStore,
  {
    post: async () => { throw new Error('timeout') },
    get: async (received) => { assert.equal(received.method, 'GET'); assert.equal(received.url.includes('filter%5Binvoice_id%5D=9876'), true); return { status: 200, json: { data: [{ type: 'sales_invoices', id: '3002' }] } } },
  },
)
assert.deepEqual(reconciled, { status: 'provider_draft_created', providerInvoiceId: '3002', duplicate: true })
assert.equal(reconciledStore.state.value, 'provider_draft_created')

const changedStore = createStore()
const changed = await executeParasutSalesInvoiceDraft(
  { workspaceId: 'workspace-1', invoiceRecordId: 'invoice-3', companyId: '12345', accessToken: 'secret', mappedPayload: mapped, expectedRequestFingerprint: 'different' },
  changedStore,
  { post: async () => { throw new Error('must not be called') } },
)
assert.deepEqual(changed, { status: 'reconciliation_required', reason: 'request_changed' })
assert.equal(changedStore.state.claims, 0)

const duplicateStore = createStore()
duplicateStore.state.value = 'provider_draft_created'
duplicateStore.state.providerInvoiceId = '3001'
const duplicate = await executeParasutSalesInvoiceDraft(
  { workspaceId: 'workspace-1', invoiceRecordId: 'invoice-4', companyId: '12345', accessToken: 'secret', mappedPayload: mapped, expectedRequestFingerprint: mapped.requestFingerprint },
  duplicateStore,
  { post: async () => { throw new Error('must not be called') } },
)
assert.deepEqual(duplicate, { status: 'provider_draft_created', providerInvoiceId: '3001', duplicate: true })

console.log('PASS parasut sales invoice create tests')
