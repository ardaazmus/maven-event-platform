import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const route = readFileSync(new URL('../src/app/api/public/forms/[slug]/payment-intents/route.ts', import.meta.url), 'utf8')

assert.match(route, /bindPaymentOrderToSubmission/)
assert.match(route, /body\.submissionToken/)
assert.match(route, /submissionId: submission\.id/)
assert.match(route, /created\.order\.submissionId/)
assert.match(route, /submission_binding_required/)

console.log('public-payment-intent-submission-binding.test: PASS (INV/F C-02)')
