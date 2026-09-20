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

const ev = await post('/api/events', { title: `F5-09 Ev ${Date.now()}` })
assert(ev.status === 201, `setup event 201, got ${ev.status}`)
const eventId = ev.json.data.id
const space = `C-1-${Date.now()}`
const hold = await post(`/api/events/${eventId}/holds`, { spaceRef: space, ttlMinutes: 10 })
assert(hold.status === 201, `setup hold 201, got ${hold.status}`)

const rel = await post('/api/inventory-releases', { holdToken: hold.json.data.holdToken, reason: 'vazgeçildi' })
assert(rel.status === 200, `release 200, got ${rel.status}`)
assert(rel.json.data?.status === 'released', 'status released')

// Booked hold release koruması
const ord = await post('/api/orders', { currency: 'TRY', items: [{ description: 'Stand', quantity: 1, unitAmountMinor: 100, currency: 'TRY' }] })
const hold2 = await post(`/api/events/${eventId}/holds`, { spaceRef: `${space}-b`, ttlMinutes: 10 })
const book = await post('/api/inventory-bookings', { holdToken: hold2.json.data.holdToken, orderId: ord.json.data.id })
assert(book.status === 200, `setup book 200, got ${book.status}`)
const prot = await post('/api/inventory-releases', { holdToken: hold2.json.data.holdToken, reason: 'erken' })
assert(prot.status === 409, `booked 409, got ${prot.status}`)

// Cleanup synthetic rows
await db.inventoryHold.deleteMany({ where: { eventId } })
await db.order.deleteMany({ where: { id: ord.json.data.id } })
await db.event.deleteMany({ where: { id: eventId } })
await db.$disconnect()

console.log('inventory-release.test: PASS')
