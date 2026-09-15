import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { classifyInvoiceDeliveryFailure, INVOICE_DELIVERY_MAX_ATTEMPTS } from '../src/lib/invoice-delivery-retry.ts'

const worker = readFileSync('src/lib/outbox-dispatch-worker.ts', 'utf8')
assert(worker.includes('classifyInvoiceDeliveryFailure'), 'dispatch worker must classify invoice delivery failures')
assert(worker.includes('attemptCount'), 'dispatch worker must pass persisted attempt count to classification')
assert(worker.includes('completeOutboxEvent'), 'dispatch worker must persist retry/dead-letter decisions')

assert.deepEqual(classifyInvoiceDeliveryFailure({ code: 'dispatch_payload_invalid', attemptCount: 1 }), {
  code: 'dispatch_payload_invalid', failureKind: 'permanent', terminal: true,
})
assert.deepEqual(classifyInvoiceDeliveryFailure({ code: 'provider_connection_missing', attemptCount: 1 }), {
  code: 'provider_connection_missing', failureKind: 'retryable', terminal: false,
})
assert.deepEqual(classifyInvoiceDeliveryFailure({ code: 'mailchimp_transactional_http_error', attemptCount: 4 }), {
  code: 'mailchimp_transactional_http_error', failureKind: 'retryable', terminal: false,
})
assert.deepEqual(classifyInvoiceDeliveryFailure({ code: 'mailchimp_transactional_http_error', attemptCount: INVOICE_DELIVERY_MAX_ATTEMPTS }), {
  code: 'mailchimp_transactional_http_error', failureKind: 'permanent', terminal: true,
})
assert.deepEqual(classifyInvoiceDeliveryFailure({ code: 'provider_rejected', attemptCount: 1 }), {
  code: 'provider_rejected', failureKind: 'permanent', terminal: true,
})
assert.deepEqual(classifyInvoiceDeliveryFailure({ code: 'raw provider secret: abc', attemptCount: 1 }), {
  code: 'invoice_delivery_failed', failureKind: 'retryable', terminal: false,
})

console.log('invoice-delivery-retry.test: PASS (INV/F-E-02-01)')
