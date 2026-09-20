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

// Setup: 2 events + person + 2 registrations + 2 tickets + hold on ev1
const stamp = Date.now()
const ev1 = await post('/api/events', { title: `F5-12 A ${stamp}` })
assert(ev1.status === 201, `setup ev1 201, got ${ev1.status}`)
const ev2 = await post('/api/events', { title: `F5-12 B ${stamp}` })
assert(ev2.status === 201, `setup ev2 201, got ${ev2.status}`)
const per = await post('/api/persons', { fullName: 'F5-12 Assign' })
assert(per.status === 201, `setup person 201, got ${per.status}`)
async function regTicket(eventId) {
  const reg = await post('/api/registrations', { eventId, personId: per.json.data.id })
  assert(reg.status === 201, `setup reg 201, got ${reg.status}`)
  const tick = await post(`/api/registrations/${reg.json.data.id}/ticket`, {})
  assert(tick.status === 201, `setup ticket 201, got ${tick.status}`)
  return { regId: reg.json.data.id, ticketId: tick.json.data.id }
}
const a = await regTicket(ev1.json.data.id)
const b = await regTicket(ev2.json.data.id)
const hold = await post(`/api/events/${ev1.json.data.id}/holds`, { spaceRef: `D-1-${stamp}`, ttlMinutes: 10 })
assert(hold.status === 201, `setup hold 201, got ${hold.status}`)
const holdId = hold.json.data.id

const ok = await post(`/api/holds/${holdId}/assign`, { ticketId: a.ticketId })
assert(ok.status === 200, `assign 200, got ${ok.status}`)

const wrong = await post(`/api/holds/${holdId}/assign`, { ticketId: b.ticketId })
assert(wrong.status === 422, `wrong-event 422, got ${wrong.status}`)

// Cleanup synthetic rows
await db.inventoryHold.deleteMany({ where: { eventId: { in: [ev1.json.data.id, ev2.json.data.id] } } })
for (const t of [a.ticketId, b.ticketId]) {
  await db.credential.deleteMany({ where: { ticketId: t } })
}
await db.ticket.deleteMany({ where: { id: { in: [a.ticketId, b.ticketId] } } })
await db.registration.deleteMany({ where: { id: { in: [a.regId, b.regId] } } })
await db.event.deleteMany({ where: { id: { in: [ev1.json.data.id, ev2.json.data.id] } } })
await db.person.deleteMany({ where: { id: per.json.data.id } })
await db.$disconnect()

console.log('hold-assign.test: PASS')
