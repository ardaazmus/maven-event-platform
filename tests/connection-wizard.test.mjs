import assert from 'node:assert/strict'
import { DEFAULT_CONNECTION_WIZARD_STEPS, getConnectionWizardStepIndex } from '../src/components/mavenforms/connection-wizard.tsx'
import { readFileSync } from 'node:fs'

assert.deepEqual(DEFAULT_CONNECTION_WIZARD_STEPS.map(step => step.id), ['scope', 'credentials', 'verify', 'review'])
assert.equal(getConnectionWizardStepIndex(DEFAULT_CONNECTION_WIZARD_STEPS, 'verify'), 2)
assert.equal(getConnectionWizardStepIndex(DEFAULT_CONNECTION_WIZARD_STEPS, 'missing'), 0)
assert.equal(getConnectionWizardStepIndex([], 'missing'), 0)

const source = readFileSync('src/components/mavenforms/connection-wizard.tsx', 'utf8')
for (const marker of ['role="tablist"', 'aria-selected', 'onRefresh', 'onCancel', 'disabled={isFirst}', 'disabled={isLast}']) {
  assert(source.includes(marker), `wizard shell missing ${marker}`)
}
assert(source.includes('aria-controls={panelId}'), 'wizard tabs must point to their panel')
assert(source.includes('aria-labelledby={`${wizardId}-tab-${step.id}`}'), 'wizard panel must point to its active tab')
assert(source.includes('grid-cols-2 gap-2 sm:grid-cols-4'), 'wizard steps must be responsive on mobile and desktop')
assert(source.includes('min-h-11 w-full min-w-0'), 'wizard tabs must keep a usable touch target')
assert.equal(source.includes('fetch('), false)
assert.equal(source.includes('db.'), false)
assert.equal(source.includes('credentialsEnvelope'), false)

console.log('connection-wizard.test: PASS (R10-V4-24)')
