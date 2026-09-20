import assert from 'node:assert'
import { db } from '../src/lib/db.ts'
import { randomBytes } from 'node:crypto'

const base = 'http://127.0.0.1:3000'
async function login() {
  const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@mavenforms.com', password: 'demo1234' }) })
  const j = await r.json()
  assert(r.status === 200 && j.data?.token, 'login 200')
  return j.data.token
}
const token = await login()
const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
const post = async (path, body, key) => {
  const h = { ...auth }
  if (key) h['Idempotency-Key'] = key
  const r = await fetch(base + path, { method: 'POST', headers: h, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}

const ord = await post('/api/orders', { currency: 'TRY', items: [{ description: 'Bilet', quantity: 2, unitAmountMinor: 25000, currency: 'TRY' }] })
assert(ord.status === 201, `setup order 201, got ${ord.status}`)
const orderId = ord.json.data.id

// Client tutarı yoksayılır; server 2*25000=50000 hesaplar
const key = `f603-${Date.now()}-${randomBytes(4).toString('hex')}`
const intent = await post('/api/checkout-intents', { orderId, amountMinor: 1 }, key)
assert(intent.status === 201, `intent 201, got ${intent.status}`)
assert(intent.json.data?.amountMinor === 50000, `server-priced 50000, got ${intent.json.data?.amountMinor}`)
const intentId = intent.json.data.id

const retry = await post('/api/checkout-intents', { orderId, amountMinor: 999 }, key)
assert(retry.status === 200, `retry 200, got ${retry.status}`)
assert(retry.json.data?.id === intentId, 'same intent')

await db.checkoutIntent.deleteMany({ where: { id: intentId } })
await db.order.deleteMany({ where: { id: orderId } })
await db.$disconnect()

console.log('checkout-intent.test: PASS')
