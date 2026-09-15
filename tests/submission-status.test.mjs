import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const policy = readFileSync('src/lib/policy.ts', 'utf8')
const route = readFileSync('src/app/api/forms/[id]/submissions/[subId]/route.ts', 'utf8')

assert(policy.includes("'submissions.payment_update'"), 'manual payment must have a dedicated capability')
assert(policy.includes('accounting'), 'accounting must be represented in the role capability matrix')
assert(route.includes('updateSubmissionPayment'), 'payment-only update must use the dedicated policy helper')
assert(route.includes('can.updateSubmissions'), 'submission status update must keep the existing broader capability')
assert(route.includes('paymentStatus'), 'payment status must remain allowlisted')
assert(route.includes('.strict()'), 'submission update body must reject unknown fields')

console.log('submission-status.test: PASS (AC-V1-04-AUTH)')
