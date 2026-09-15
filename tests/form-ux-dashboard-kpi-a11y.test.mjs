import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const dashboard = readFileSync('src/components/mavenforms/views/dashboard-view.tsx', 'utf8')

assert.match(dashboard, /role=\{onClick \? 'button' : undefined\}/, 'clickable KPI cards need button semantics')
assert.match(dashboard, /tabIndex=\{onClick \? 0 : undefined\}/, 'clickable KPI cards need keyboard focus')
assert.match(dashboard, /onKeyDown=\{\(event\) => \{/, 'clickable KPI cards need keyboard activation')
assert.match(dashboard, /event\.key === 'Enter' \|\| event\.key === ' '/, 'KPI cards must activate on Enter or Space')
assert.match(dashboard, /onClick=\{onClick\}/, 'existing KPI card click routing must remain wired')

console.log('form-ux-dashboard-kpi-a11y.test: PASS')
