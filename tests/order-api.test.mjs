import assert from 'node:assert'
import { db } from '../src/lib/db.ts'

const base = 'http://127.0.0.1:3000'
async function login() {
  const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@mavenforms.com', password: 'demo1234' }) })
  const j = await r.json()
  assert(r.status === 200 && j.data?.token, 'login 200')
  return j.data.token
}
async function post(path, body, token) {
  const h = { 'Content-Type': 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  const r = await fetch(base + path, { method: 'POST', headers: h, body: JSON.stringify(body) })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}

const anon = await post('/api/orders', { items: [] })
assert(anon.status === 401, `anon 401, got ${anon.status}`)

const token = await login()
const neg = await post('/api/orders', { currency: 'TRY', items: [{ description: 'X', quantity: 1, unitAmountMinor: -100, currency: 'TRY' }] }, token)
assert(neg.status === 400, `negative 400, got ${neg.status}`)

const mismatch = await post('/api/orders', { currency: 'TRY', items: [{ description: 'X', quantity: 1, unitAmountMinor: 100, currency: 'USD' }] }, token)
assert(mismatch.status === 400, `currency mismatch 400, got ${mismatch.status}`)

const created = await post('/api/orders', { currency: 'TRY', items: [
  { description: 'Bilet', quantity: 2, unitAmountMinor: 50000, currency: 'TRY' },
  { description: 'Vergi', quantity: 1, unitAmountMinor: 20000, taxAmountMinor: 4000, currency: 'TRY' },
] }, token)
assert(created.status === 201, `valid 201, got ${created.status}`)
// total = 2*50000 + (20000+4000) = 124000
assert(created.json.data?.totalMinor === 124000, `total 124000, got ${created.json.data?.totalMinor}`)

const id = created.json.data.id
const stored = await db.order.findUnique({ where: { id }, include: { items: true } })
const recomputed = stored.items.reduce((a, it) => a + it.quantity * it.unitAmountMinor + it.taxAmountMinor - it.discountAmountMinor, 0)
assert(recomputed === 124000, 'stored snapshots sum to total')

await db.order.deleteMany({ where: { id } })
await db.$disconnect()

console.log('order-api.test: PASS')
