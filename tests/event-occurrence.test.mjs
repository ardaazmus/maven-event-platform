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

// Setup synthetic event
const title = `F1-09 Occ ${Date.now()}`
const created = await fetch(base + '/api/events', { method: 'POST', headers: auth, body: JSON.stringify({ title }) })
assert(created.status === 201, `setup event 201, got ${created.status}`)
const { data } = await created.json()

// Inverted dates -> 400
const bad = await fetch(base + `/api/events/${data.id}/occurrences`, { method: 'POST', headers: auth, body: JSON.stringify({ startsAt: '2026-10-02T10:00:00Z', endsAt: '2026-10-01T10:00:00Z' }) })
assert(bad.status === 400, `inverted 400, got ${bad.status}`)

// Valid -> 201
const good = await fetch(base + `/api/events/${data.id}/occurrences`, { method: 'POST', headers: auth, body: JSON.stringify({ venue: 'Hall A', startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-02T10:00:00Z' }) })
assert(good.status === 201, `valid 201, got ${good.status}`)

// Unknown event -> 404
const missing = await fetch(base + '/api/events/does-not-exist/occurrences', { method: 'POST', headers: auth, body: JSON.stringify({ startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-02T10:00:00Z' }) })
assert(missing.status === 404, `missing 404, got ${missing.status}`)

await db.event.deleteMany({ where: { id: data.id } })
await db.$disconnect()

console.log('event-occurrence.test: PASS')
