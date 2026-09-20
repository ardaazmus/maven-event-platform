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

const anon = await post('/api/registrations', { eventId: 'x', personId: 'y' })
assert(anon.status === 401, `anon 401, got ${anon.status}`)

const token = await login()
// Setup synthetic event + person via API
const ev = await post('/api/events', { title: `F1-15 Ev ${Date.now()}` }, token)
assert(ev.status === 201, `setup event 201, got ${ev.status}`)
const eventId = ev.json.data.id
const per = await post('/api/persons', { fullName: 'F1-15 Person' }, token)
assert(per.status === 201, `setup person 201, got ${per.status}`)
const personId = per.json.data.id

// Wrong scope -> 404
const wrong = await post('/api/registrations', { eventId: 'does-not-exist', personId }, token)
assert(wrong.status === 404, `wrong-scope 404, got ${wrong.status}`)

// Valid -> 201 + history
const created = await post('/api/registrations', { eventId, personId }, token)
assert(created.status === 201, `valid 201, got ${created.status}`)
const regId = created.json.data?.id
assert(regId, 'returns id')
const hist = await db.registrationHistory.count({ where: { registrationId: regId } })
assert(hist === 1, `history 1 row, got ${hist}`)

// Cleanup (dev DB synthetic only)
await db.registration.deleteMany({ where: { id: regId } })
await db.event.deleteMany({ where: { id: eventId } })
await db.person.deleteMany({ where: { id: personId } })
await db.$disconnect()

console.log('registration-api.test: PASS')
