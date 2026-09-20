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
const auth = { Authorization: `Bearer ${token}` }
const post = async (path, body) => {
  const r = await fetch(base + path, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}

const anon = await fetch(base + '/api/tickets/does-not-exist/badge')
assert(anon.status === 401, `anon 401, got ${anon.status}`)

const ev = await post('/api/events', { title: `F4-07 Ev ${Date.now()}` })
assert(ev.status === 201, `setup event 201, got ${ev.status}`)
const per = await post('/api/persons', { fullName: 'F4-07 Badge' })
assert(per.status === 201, `setup person 201, got ${per.status}`)
const reg = await post('/api/registrations', { eventId: ev.json.data.id, personId: per.json.data.id })
assert(reg.status === 201, `setup reg 201, got ${reg.status}`)
const tick = await post(`/api/registrations/${reg.json.data.id}/ticket`, {})
assert(tick.status === 201, `setup ticket 201, got ${tick.status}`)
const ticketId = tick.json.data.id

const badge = await fetch(base + `/api/tickets/${ticketId}/badge`, { headers: auth })
assert(badge.status === 200, `badge 200, got ${badge.status}`)
const bj = await badge.json()
assert(bj.data?.qrCode, 'qrCode')
assert(bj.data?.personName === 'F4-07 Badge', 'person snapshot')
assert(bj.data?.eventTitle?.startsWith('F4-07 Ev'), 'event snapshot')

const wrong = await fetch(base + '/api/tickets/does-not-exist/badge', { headers: auth })
assert(wrong.status === 404, `wrong 404, got ${wrong.status}`)

// Cleanup synthetic rows
const t = await db.ticket.findUnique({ where: { id: ticketId } })
if (t) await db.credential.deleteMany({ where: { ticketId } })
await db.ticket.deleteMany({ where: { id: ticketId } })
await db.registration.deleteMany({ where: { id: reg.json.data.id } })
await db.event.deleteMany({ where: { id: ev.json.data.id } })
await db.person.deleteMany({ where: { id: per.json.data.id } })
await db.$disconnect()

console.log('ticket-badge.test: PASS')
