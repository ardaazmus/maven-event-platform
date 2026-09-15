import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/forms/[id]/submissions/[subId]/route.ts', 'utf8')

assert(route.includes("import { z } from 'zod'"), 'submission update must use a schema validator')
assert(route.includes('updateSubmissionSchema'), 'submission update schema must be explicit')
assert(route.includes("z.enum(['new', 'reviewing', 'approved', 'rejected', 'spam', 'archived'])"), 'submission status must be allowlisted')
assert(route.includes("z.enum(['pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded'])"), 'legacy payment status must be allowlisted')
assert(route.includes('safeParse'), 'malformed or invalid update bodies must return a client error')
assert(route.includes("status: 400"), 'invalid update bodies must not become server errors')

console.log('submission-update-validation.test: PASS (SUBMISSION-VALIDATION-01)')
