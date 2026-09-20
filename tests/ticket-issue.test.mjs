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

// Setup: event + person + registration
const ev = await post('/api/events', { title: `F4-03 Ev ${Date.now()}` })
assert(ev.status === 201, `setup event 201, got ${ev.status}`)
const per = await post('/api/persons', { fullName: 'F4-03 Person' })
assert(per.status === 201, `setup person 201, got ${per.status}`)
const reg = await post('/api/registrations', { eventId: ev.json.data.id, personId: per.json.data.id })
assert(reg.status === 201, `setup reg 201, got ${reg.status}`)
const regId = reg.json.data.id

const issue = await post(`/api/registrations/${regId}/ticket`, {})
assert(issue.status === 201, `issue 201, got ${issue.status}`)
assert(issue.json.data?.code && issue.json.data?.qrCode, 'code+qrCode')

const again = await post(`/api/registrations/${regId}/ticket`, {})
assert(again.status === 409, `repeat 409, got ${again.status}`)

// Cleanup synthetic rows
const t = await db.ticket.findUnique({ where: { registrationId: regId } })
if (t) await db.credential.deleteMany({ where: { ticketId: t.id } })
await db.ticket.deleteMany({ where: { registrationId: regId } })
await db.registration.deleteMany({ where: { id: regId } })
await db.event.deleteMany({ where: { id: ev.json.data.id } })
await db.person.deleteMany({ where: { id: per.json.data.id } })
await db.$disconnect()

console.log('ticket-issue.test: PASS')
