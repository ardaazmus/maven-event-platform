import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const decision = readFileSync('RELEASE-DECISION.md', 'utf8')
const status = readFileSync('STATUS.md', 'utf8')
const plan = readFileSync('docs/superpowers/plans/2026-09-02-mavenforms-e-belge-15-dakikalik-uygulama-paketleri.md', 'utf8')

assert(decision.includes('R-10 final release gate'), 'current final gate checkpoint is required')
assert(decision.includes('NO-GO'), 'unverified external evidence must not produce GO')
assert(/gerçek provider/i.test(decision), 'provider evidence boundary must be visible')
assert(decision.includes('mali müşavir'), 'accounting acceptance boundary must be visible')
assert(decision.includes('GİB'), 'GIB evidence boundary must be visible')
assert(decision.includes('production'), 'production boundary must be visible')
assert(status.includes('R-09'), 'previous technical acceptance phase must remain recorded')
assert(status.includes('release açık değil'), 'local pass must not open release')
assert(plan.includes('R-10'), 'master plan must retain final gate')
assert(/gerçek test hesabı/i.test(plan) || /live mode açılmaz/i.test(plan), 'external provider gate must remain explicit')

console.log('PASS final release gate test (NO-GO while external evidence is unverified)')
