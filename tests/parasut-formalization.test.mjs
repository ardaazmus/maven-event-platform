import assert from 'node:assert/strict'
import {
  buildParasutFormalizationRequest,
  executeParasutFormalization,
  parseParasutTrackableJobId,
  parasutFormalizationFingerprint,
} from '../src/lib/providers/parasut-formalization.ts'

const eInvoice = {
  companyId: '12345',
  salesInvoiceId: '3001',
  documentType: 'e_invoice',
  eInvoiceScenario: 'commercial',
  eInvoiceAddress: 'urn:mail:recipient@example.com',
}
const eInvoiceRequest = buildParasutFormalizationRequest(eInvoice, 'secret-only-in-memory')
assert.equal(eInvoiceRequest.url, 'https://api.parasut.com/v4/12345/e_invoices')
assert.deepEqual(JSON.parse(eInvoiceRequest.body), {
  data: {
    type: 'e_invoices',
    attributes: { scenario: 'commercial', to: 'urn:mail:recipient@example.com' },
    relationships: { invoice: { data: { type: 'sales_invoices', id: '3001' } } },
  },
})
assert.equal(eInvoiceRequest.body.includes('secret-only-in-memory'), false)

const eArchive = {
  companyId: '12345',
  salesInvoiceId: '3001',
  documentType: 'e_archive',
  internetSale: { url: 'https://example.com/order/3001', paymentType: 'ODEMEARACISI', paymentPlatform: 'Stripe', paymentDate: '2026-09-05' },
}
assert.deepEqual(JSON.parse(buildParasutFormalizationRequest(eArchive, 'secret').body), {
  data: {
    type: 'e_archives',
    attributes: { internet_sale: { url: 'https://example.com/order/3001', payment_type: 'ODEMEARACISI', payment_platform: 'Stripe', payment_date: '2026-09-05' } },
    relationships: { sales_invoice: { data: { type: 'sales_invoices', id: '3001' } } },
  },
})
assert.throws(() => buildParasutFormalizationRequest({ ...eArchive, internetSale: { ...eArchive.internetSale, paymentPlatform: undefined } }, 'secret'), /payment platform/)
assert.throws(() => buildParasutFormalizationRequest({ ...eArchive, internetSale: { ...eArchive.internetSale, url: 'http://example.com' } }, 'secret'), /url/)
assert.equal(parseParasutTrackableJobId({ data: { type: 'trackable_jobs', id: '7001' } }), '7001')
assert.equal(parseParasutTrackableJobId({ data: { type: 'e_invoices', id: '7001' } }), null)
assert.equal(parseParasutTrackableJobId({ data: { type: 'trackable_jobs', id: 'job-7001' } }), null)

function createStore(state = 'provider_draft_created', providerJobId = null) {
  const value = { state, providerJobId, transitions: [] }
  return {
    value,
    async claimDraftCreated() {
      if (value.state !== 'provider_draft_created') return { claimed: false, state: value.state, providerJobId: value.providerJobId }
      value.state = 'formalization_submitting'
      value.transitions.push('claim')
      return { claimed: true }
    },
    async markFormalizationPending(_id, jobId) { value.state = 'formalization_pending'; value.providerJobId = jobId; value.transitions.push('pending') },
    async markReconciliationRequired() { value.state = 'reconciliation_required'; value.transitions.push('reconciliation') },
    async markProviderError() { value.state = 'provider_error'; value.transitions.push('error') },
  }
}

const confirmedStore = createStore()
const confirmed = await executeParasutFormalization(
  { workspaceId: 'workspace-1', invoiceRecordId: 'invoice-1', accessToken: 'secret', input: eInvoice, expectedRequestFingerprint: parasutFormalizationFingerprint(eInvoice) },
  confirmedStore,
  { post: async request => { assert.equal(request.url, eInvoiceRequest.url); return { status: 201, json: { data: { type: 'trackable_jobs', id: '7001' } } } } },
)
assert.deepEqual(confirmed, { status: 'formalization_pending', providerJobId: '7001', duplicate: false })
assert.deepEqual(confirmedStore.value.transitions, ['claim', 'pending'])

const ambiguousStore = createStore()
const ambiguous = await executeParasutFormalization(
  { workspaceId: 'workspace-1', invoiceRecordId: 'invoice-2', accessToken: 'secret', input: eInvoice, expectedRequestFingerprint: parasutFormalizationFingerprint(eInvoice) },
  ambiguousStore,
  { post: async () => ({ status: 201, json: { data: { type: 'e_invoices', id: '7001' } } }) },
)
assert.deepEqual(ambiguous, { status: 'reconciliation_required', reason: 'ambiguous_provider_result' })

const timeoutStore = createStore()
const timeout = await executeParasutFormalization(
  { workspaceId: 'workspace-1', invoiceRecordId: 'invoice-3', accessToken: 'secret', input: eInvoice, expectedRequestFingerprint: parasutFormalizationFingerprint(eInvoice) },
  timeoutStore,
  { post: async () => { throw new Error('timeout') } },
)
assert.deepEqual(timeout, { status: 'reconciliation_required', reason: 'transport_timeout' })

const authStore = createStore()
const auth = await executeParasutFormalization(
  { workspaceId: 'workspace-1', invoiceRecordId: 'invoice-4', accessToken: 'secret', input: eInvoice, expectedRequestFingerprint: parasutFormalizationFingerprint(eInvoice) },
  authStore,
  { post: async () => ({ status: 401 }) },
)
assert.deepEqual(auth, { status: 'provider_error', reason: 'authentication' })

const duplicate = await executeParasutFormalization(
  { workspaceId: 'workspace-1', invoiceRecordId: 'invoice-5', accessToken: 'secret', input: eInvoice, expectedRequestFingerprint: parasutFormalizationFingerprint(eInvoice) },
  createStore('formalization_pending', '7001'),
  { post: async () => { throw new Error('must not call provider') } },
)
assert.deepEqual(duplicate, { status: 'formalization_pending', providerJobId: '7001', duplicate: true })

console.log('PASS parasut formalization tests')
