import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const reports = readFileSync('src/components/mavenforms/views/reports-view.tsx', 'utf8')

assert(reports.includes('function calculateTrendDelta'), 'reports must centralize trend delta calculation')
assert(reports.includes('previous > 0 ? Math.round(((current - previous) / previous) * 100) : null'), 'zero baseline must not become a fake percentage')
assert(reports.includes("trendDelta === null ? 'Yeni dönem'"), 'zero baseline must be explained as a new period')
assert(reports.includes("trendDelta >= 0 ? '+' : ''"), 'positive and negative deltas must render with correct sign')
assert(reports.includes("trendDelta !== null && trendDelta < 0 && 'text-rose-600"), 'negative deltas need a distinct visual state')

console.log('form-ux-reports-kpi.test: PASS')
