import assert from 'node:assert'
import { db } from '../src/lib/db.ts'

const base = 'http://127.0.0.1:3000'
async function login() {
  const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@mavenforms.com', password: 'demo1234' }) })
  const j = await r.json()
  assert(r.status === 200 && j.data?.token, 'login 200')
  return j.data.token
}
const token = await login()
const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
const post = async (path, body) => {
  const r = await fetch(base + path, { method: 'POST', headers: auth, body: JSON.stringify(body) })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}

// Setup: order 100000 + payment 60000
const ord = await post('/api/orders', { currency: 'TRY', items: [{ description: 'Bilet', quantity: 1, unitAmountMinor: 100000, currency: 'TRY' }] })
assert(ord.status === 201, `setup order 201, got ${ord.status}`)
const orderId = ord.json.data.id
const pay = await post('/api/payments', { amountMinor: 60000, currency: 'TRY', method: 'bank_transfer', reference: `F2-07-${Date.now()}` }, )
assert(pay.status === 201, `setup payment 201, got ${pay.status}`)
const paymentId = pay.json.data.id

// Over-allocation -> 400
const over = await post(`/api/payments/${paymentId}/allocations`, { allocations: [{ orderId, amountMinor: 70000 }] })
assert(over.status === 400, `over 400, got ${over.status}`)

// Partial -> partially_paid + unallocated 0? payment fully used: unallocated = 60000-60000 = 0
const part = await post(`/api/payments/${paymentId}/allocations`, { allocations: [{ orderId, amountMinor: 60000 }] })
assert(part.status === 200, `partial 200, got ${part.status}`)
assert(part.json.data?.unallocatedMinor === 0, 'unallocated 0')
const o1 = await db.order.findUnique({ where: { id: orderId } })
assert(o1.status === 'partially_paid', `partially_paid, got ${o1.status}`)

// Second payment completes -> paid
const pay2 = await post('/api/payments', { amountMinor: 50000, currency: 'TRY', method: 'cash', reference: `F2-07b-${Date.now()}` })
const done = await post(`/api/payments/${pay2.json.data.id}/allocations`, { allocations: [{ orderId, amountMinor: 40000 }] })
assert(done.status === 200, `second 200, got ${done.status}`)
assert(done.json.data?.unallocatedMinor === 10000, 'unallocated 10000 (overpayment kept, not revenue)')
const o2 = await db.order.findUnique({ where: { id: orderId } })
assert(o2.status === 'paid', `paid, got ${o2.status}`)

// Cleanup synthetic rows
await db.paymentAllocation.deleteMany({ where: { orderId } })
await db.payment.deleteMany({ where: { id: { in: [paymentId, pay2.json.data.id] } } })
await db.order.deleteMany({ where: { id: orderId } })
await db.$disconnect()

console.log('payment-allocation.test: PASS')
