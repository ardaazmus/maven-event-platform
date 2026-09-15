import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'

const routePath = 'src/app/api/public/forms/[slug]/payment-callback/route.ts'
assert(existsSync(routePath), 'public payment callback route must exist')
const route = readFileSync(routePath, 'utf8')

assert.match(route, /export async function GET/)
assert.match(route, /export async function POST/)
assert.match(route, /parseIyzicoCallbackInput/)
assert.match(route, /buildPublicPaymentStatusApiPath/)
assert.match(route, /correlatePublicPaymentReceipt/)
assert.match(route, /queueIyzicoPaymentRetrieve/)
assert.match(route, /db\.paymentOrder\.findUnique/)
assert.match(route, /form: \{ select: \{ slug: true \} \}/)
assert.match(route, /status: 'processing'/)
assert.doesNotMatch(route, /paymentOrder\.(update|create)/)
assert.doesNotMatch(route, /status: 'succeeded'/)
assert.doesNotMatch(route, /data: \{ token/)

console.log('public-payment-callback-route.test: PASS (PAY-06D-23)')
