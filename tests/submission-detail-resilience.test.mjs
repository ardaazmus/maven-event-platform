import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/forms/[id]/submissions/[subId]/route.ts', 'utf8')

assert(route.includes('parseSubmissionValue'), 'submission detail must use a guarded value parser')
assert(route.includes('JSON.parse(valueJson ||'), 'guarded parser must read stored submission values')
assert(route.includes('return { value: null }'), 'malformed submission values must have a safe fallback')
assert(!route.includes('value: JSON.parse(v.valueJson ||'), 'submission detail must not parse stored values inline')

console.log('submission-detail-resilience.test: PASS (SUBMISSION-RESILIENCE-01)')
