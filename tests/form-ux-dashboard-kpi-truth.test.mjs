import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const dashboard = readFileSync('src/components/mavenforms/views/dashboard-view.tsx', 'utf8')

assert(!dashboard.includes('trend="+2"'), 'total form KPI must not use a hardcoded trend')
assert(!dashboard.includes('trend="+18%"'), 'today submission KPI must not use a hardcoded trend')
assert.match(dashboard, /label="Toplam Form"[\s\S]*value=\{stats\.totalForms\}/, 'total form KPI must remain data-backed')
assert.match(dashboard, /label="Bugünkü Yanıt"[\s\S]*value=\{stats\.todaySubmissions\}/, 'today submission KPI must remain data-backed')

console.log('form-ux-dashboard-kpi-truth.test: PASS')
