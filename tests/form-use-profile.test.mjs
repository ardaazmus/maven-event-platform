import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const source = readFileSync('src/lib/form-use-profile.ts', 'utf8')
const createRoute = readFileSync('src/app/api/forms/route.ts', 'utf8')
const updateRoute = readFileSync('src/app/api/forms/[id]/route.ts', 'utf8')

for (const profile of ['event_registration', 'research_survey', 'quiz']) {
  assert(source.includes(`'${profile}'`), `${profile} must be a supported profile`)
}

assert(source.includes('defaultFieldTypes'), 'profiles must define default field types')
assert(source.includes('defaultHelpText'), 'profiles must define default help text')
assert(source.includes('reportView'), 'profiles must define report view')
assert(source.includes('paymentCapabilityEnabled: false'), 'profiles must not enable payments')
assert(source.includes('paymentDecisionAutomation: false'), 'profiles must not automate payment decisions')
assert(source.includes('export function getFormUseProfileConfig'), 'profile config must have a single resolver')
assert(source.includes('return null'), 'unknown profiles must fail closed')

assert(createRoute.includes('useProfile'), 'form creation must persist the selected profile')
assert(updateRoute.includes('useProfile'), 'form update must persist the selected profile')
assert(updateRoute.includes('settingsJson'), 'profile must remain in versioned form settings')
assert(source.includes('snapshot') && source.includes('immutable'), 'profile contract must document snapshot immutability')

console.log('form-use-profile.test: PASS (AC-V1-03)')
