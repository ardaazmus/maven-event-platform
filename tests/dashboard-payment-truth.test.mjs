import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/dashboard/route.ts', 'utf8')
const view = readFileSync('src/components/mavenforms/views/dashboard-view.tsx', 'utf8')
const types = readFileSync('src/lib/types.ts', 'utf8')

assert(!route.includes('VIP=1500'), 'dashboard must not invent payment prices')
assert(!route.includes('paymentTotal += 500'), 'dashboard must not estimate unknown payment totals')
assert(!view.includes('trend="+24%"'), 'dashboard must not show a fabricated payment trend')
assert(types.includes('paymentTotal: number | null'), 'payment total must support an unavailable truthful state')
assert(view.includes("stats.paymentTotal === null"), 'dashboard must render unavailable payment data explicitly')

console.log('dashboard-payment-truth.test: PASS (PAYMENT-TRUTH-01)')
