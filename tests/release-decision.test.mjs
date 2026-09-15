import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const doc = readFileSync('RELEASE-DECISION.md','utf8')
assert(doc.includes('GO_WITH_CAVEATS') || doc.includes('NO-GO'), 'must have decision')
assert(doc.includes('build network'), 'must check build')
assert(doc.includes('public snapshot'), 'must check public')
assert(doc.includes('media upload private'), 'must check media')
assert(doc.includes('WordPress'), 'must check WordPress')
assert(doc.includes('outbox'), 'must check outbox')
assert(doc.includes('E2E'), 'must check E2E')
assert(doc.includes('backup restore'), 'must check backup')
assert(doc.includes('DEFERRED') || doc.includes('PASS'), 'must have PASS/DEFERRED')

console.log('release-decision.test: PASS (AC-RELEASE-01)')
