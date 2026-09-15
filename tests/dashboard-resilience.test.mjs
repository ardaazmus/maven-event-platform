import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/dashboard/route.ts', 'utf8')

assert(route.includes('readSubmissionValue'), 'dashboard must use a bounded submission value reader')
assert(route.includes('JSON.parse(valueJson ||'), 'submission value reader must parse stored JSON')
assert(route.includes('catch'), 'malformed stored submission JSON must be handled')
assert(!route.match(/name: formField \? JSON\.parse\(/), 'dashboard must not parse submission JSON inline without a guard')
assert(!route.match(/email: emailField \? JSON\.parse\(/), 'dashboard email projection must use the guarded reader')

console.log('dashboard-resilience.test: PASS (DASHBOARD-RESILIENCE-01)')
