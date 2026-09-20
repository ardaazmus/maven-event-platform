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
  const r = await fetch(base + path, { method: 'POST', headers: auth, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}

// Setup: event + order + hold
const ev = await post('/api/events', { title: `F5-08 Ev ${Date.now()}` })
assert(ev.status === 201, `setup event 201, got ${ev.status}`)
const eventId = ev.json.data.id
const ord = await post('/api/orders', { currency: 'TRY', items: [{ description: 'Stand', quantity: 1, unitAmountMinor: 1000, currency: 'TRY' }] })
assert(ord.status === 201, `setup order 201, got ${ord.status}`)
const orderId = ord.json.data.id
const space = `B-1-${Date.now()}`
const hold = await post(`/api/events/${eventId}/holds`, { spaceRef: space, ttlMinutes: 10 })
assert(hold.status === 201, `setup hold 201, got ${hold.status}`)

// Booking -> 200 booked
const book = await post('/api/inventory-bookings', { holdToken: hold.json.data.holdToken, orderId })
assert(book.status === 200, `book 200, got ${book.status}`)
assert(book.json.data?.status === 'booked', 'status booked')

// Retry same -> 200 same result (idempotent)
const retry = await post('/api/inventory-bookings', { holdToken: hold.json.data.holdToken, orderId })
assert(retry.status === 200, `retry 200, got ${retry.status}`)

// Expired token -> 410 (ttl 0 hold expires immediately)
const hold2 = await post(`/api/events/${eventId}/holds`, { spaceRef: `${space}-x`, ttlMinutes: 0 })
assert(hold2.status === 201, `setup hold2 201, got ${hold2.status}`)
await new Promise((r) => setTimeout(r, 50))
const expired = await post('/api/inventory-bookings', { holdToken: hold2.json.data.holdToken, orderId })
assert(expired.status === 410, `expired 410, got ${expired.status}`)

// Cleanup synthetic rows
await db.inventoryHold.deleteMany({ where: { eventId } })
await db.order.deleteMany({ where: { id: orderId } })
await db.event.deleteMany({ where: { id: eventId } })
await db.$disconnect()

console.log('inventory-booking.test: PASS')
