import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/payments/route.ts', 'utf8')

// GET inbox mevcut
assert(route.includes('export async function GET'), 'GET handler olmali')
assert(route.includes('can.readInvoices'), 'finans okuma gate olmali')
assert(route.includes('allocationCount: row._count.allocations'), 'tahsis sayimi donmeli')
assert(route.includes('orderStatus'), 'siparis durumu eslemesi olmali')
assert(route.includes('take: 100'), 'limit bounded olmali')

// POST kayit kurallari degismedi
assert(route.includes('recordPaymentSchema'), 'POST semasi korunmali')
assert(route.includes('idempotencyKey'), 'POST idempotency korunmali')

// Canli: anon sizdirmadan 401
const anon = await fetch('http://127.0.0.1:3000/api/payments?orderId=x')
assert(anon.status === 401, `anon GET 401 olmali, got ${anon.status}`)

// Canli failure path: demo login ile bogus order 404 (salt-okunur)
const login = await fetch('http://127.0.0.1:3000/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@mavenforms.com', password: 'demo1234' }) })
const session = await login.json().catch(() => ({}))
assert(login.status === 200 && session.data?.token, 'demo login 200 olmali')
const bogus = await fetch('http://127.0.0.1:3000/api/payments?orderId=does-not-exist', { headers: { Authorization: `Bearer ${session.data.token}` } })
assert(bogus.status === 404, `bogus order 404 olmali, got ${bogus.status}`)

console.log('payment-inbox.test: PASS (odeme listesi + 401/404 kilitli)')
