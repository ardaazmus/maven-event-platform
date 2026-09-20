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

// Setup: event + person + registration + ticket
const ev = await post('/api/events', { title: `F4-08 Ev ${Date.now()}` })
assert(ev.status === 201, `setup event 201, got ${ev.status}`)
const per = await post('/api/persons', { fullName: 'F4-08 Offline' })
assert(per.status === 201, `setup person 201, got ${per.status}`)
const reg = await post('/api/registrations', { eventId: ev.json.data.id, personId: per.json.data.id })
assert(reg.status === 201, `setup reg 201, got ${reg.status}`)
const tick = await post(`/api/registrations/${reg.json.data.id}/ticket`, {})
assert(tick.status === 201, `setup ticket 201, got ${tick.status}`)

// Offline timestamp 1h ago, unique direction/gate combo
const past = new Date(Date.now() - 3600_000).toISOString()
const scan = await post('/api/checkin', { qrCode: tick.json.data.qrCode, direction: 'entry', gate: 'offline-gate', occurredAt: past })
assert(scan.status === 201, `offline scan 201, got ${scan.status}`)
const row = await db.checkInEvent.findUnique({ where: { id: scan.json.data.id } })
assert(row?.occurredAt.toISOString() === past, 'occurredAt korunur')

// Future -> 400
const future = new Date(Date.now() + 3600_000).toISOString()
const bad = await post('/api/checkin', { qrCode: tick.json.data.qrCode, direction: 'exit', occurredAt: future })
assert(bad.status === 400, `future 400, got ${bad.status}`)

// Cleanup synthetic rows
const t = await db.ticket.findUnique({ where: { registrationId: reg.json.data.id } })
if (t) {
  await db.checkInEvent.deleteMany({ where: { credential: { ticketId: t.id } } })
  await db.credential.deleteMany({ where: { ticketId: t.id } })
}
await db.ticket.deleteMany({ where: { registrationId: reg.json.data.id } })
await db.registration.deleteMany({ where: { id: reg.json.data.id } })
await db.event.deleteMany({ where: { id: ev.json.data.id } })
await db.person.deleteMany({ where: { id: per.json.data.id } })
await db.$disconnect()

console.log('checkin-offline.test: PASS')
