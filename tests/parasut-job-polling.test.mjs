import assert from 'node:assert/strict'
import {
  buildParasutTrackableJobRequest,
  executeParasutJobPolling,
  parseParasutTrackableJob,
  PARASUT_TRACKABLE_JOB_WINDOW_MS,
} from '../src/lib/providers/parasut-v4-jobs.ts'

const now = new Date('2026-09-05T12:00:00.000Z')
const common = { workspaceId: 'workspace-1', invoiceRecordId: 'invoice-1', companyId: '12345', providerJobId: '7001', accessToken: 'secret', now }
const request = buildParasutTrackableJobRequest('12345', '7001', 'secret')
assert.equal(request.url, 'https://api.parasut.com/v4/12345/trackable_jobs/7001')
assert.equal(request.method, 'GET')
assert.equal(request.headers.authorization, 'Bearer secret')
assert.equal(parseParasutTrackableJob({ data: { type: 'trackable_jobs', id: '7001', attributes: { status: 'running' } } })?.status, 'running')
assert.deepEqual(parseParasutTrackableJob({ data: { type: 'trackable_jobs', id: '7001', attributes: { status: 'pending' } } }), { providerJobId: '7001', status: 'running', providerStatus: 'pending' })
assert.equal(parseParasutTrackableJob({ data: { type: 'e_invoices', id: '7001', attributes: { status: 'done' } } }), null)

function createStore(createdAt = new Date('2026-09-05T11:55:00.000Z'), state = 'formalization_pending') {
  const value = { state, providerJobId: '7001', providerJobCreatedAt: createdAt, transitions: [] }
  return {
    value,
    async claimPending() {
      if (value.state !== 'formalization_pending' || value.providerJobCreatedAt < new Date(now.getTime() - PARASUT_TRACKABLE_JOB_WINDOW_MS)) return { claimed: false, state: value.state, providerJobId: value.providerJobId, providerJobCreatedAt: value.providerJobCreatedAt }
      value.state = 'formalization_polling'
      value.transitions.push('claim')
      return { claimed: true, providerJobId: value.providerJobId }
    },
    async markPending() { value.state = 'formalization_pending'; value.transitions.push('pending') },
    async markIssued() { value.state = 'issued'; value.transitions.push('issued') },
    async markFormalizationError() { value.state = 'formalization_error'; value.transitions.push('error') },
    async markReconciliationRequired() { value.state = 'reconciliation_required'; value.transitions.push('reconciliation') },
    async markExpiredPending() { value.state = 'reconciliation_required'; value.transitions.push('expired') },
    async markProviderError() { value.state = 'provider_error'; value.transitions.push('provider_error') },
  }
}

const runningStore = createStore()
assert.deepEqual(await executeParasutJobPolling(common, runningStore, { get: async received => { assert.equal(received.url, request.url); return { status: 200, json: { data: { type: 'trackable_jobs', id: '7001', attributes: { status: 'running' } } } } } }), { status: 'running', providerJobId: '7001' })
assert.deepEqual(runningStore.value.transitions, ['claim', 'pending'])

const doneStore = createStore()
assert.deepEqual(await executeParasutJobPolling(common, doneStore, { get: async () => ({ status: 200, json: { data: { type: 'trackable_jobs', id: '7001', attributes: { status: 'done' } } } }) }), { status: 'done', providerJobId: '7001', duplicate: false })
assert.equal(doneStore.value.state, 'issued')

const errorStore = createStore()
assert.deepEqual(await executeParasutJobPolling(common, errorStore, { get: async () => ({ status: 200, json: { data: { type: 'trackable_jobs', id: '7001', attributes: { status: 'error' } } } }) }), { status: 'error', providerJobId: '7001' })
assert.equal(errorStore.value.state, 'formalization_error')

const timeoutStore = createStore()
assert.deepEqual(await executeParasutJobPolling(common, timeoutStore, { get: async () => { throw new Error('timeout') } }), { status: 'provider_error', reason: 'unavailable' })
assert.equal(timeoutStore.value.state, 'formalization_pending')

const expiredStore = createStore(new Date('2026-09-05T11:00:00.000Z'))
assert.deepEqual(await executeParasutJobPolling(common, expiredStore, { get: async () => { throw new Error('must not call provider') } }), { status: 'reconciliation_required', reason: 'expired' })
assert.equal(expiredStore.value.state, 'reconciliation_required')

const rateStore = createStore()
assert.deepEqual(await executeParasutJobPolling(common, rateStore, { get: async () => ({ status: 429 }) }), { status: 'provider_error', reason: 'rate_limited' })
assert.equal(rateStore.value.state, 'formalization_pending')

const duplicate = await executeParasutJobPolling(common, createStore(now, 'issued'), { get: async () => { throw new Error('must not call provider') } })
assert.deepEqual(duplicate, { status: 'done', providerJobId: '7001', duplicate: true })

console.log('PASS parasut job polling tests')
