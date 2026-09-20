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

const ev = await post('/api/events', { title: `F5-07 Ev ${Date.now()}` })
assert(ev.status === 201, `setup event 201, got ${ev.status}`)
const eventId = ev.json.data.id
const space = `A-1-${Date.now()}`

const hold = await post(`/api/events/${eventId}/holds`, { spaceRef: space, ttlMinutes: 10 })
assert(hold.status === 201, `hold 201, got ${hold.status}`)
assert(hold.json.data?.holdToken && hold.json.data?.expiresAt, 'token+expiry')

const dup = await post(`/api/events/${eventId}/holds`, { spaceRef: space, ttlMinutes: 10 })
assert(dup.status === 409, `double 409, got ${dup.status}`)

// Cleanup synthetic rows
await db.inventoryHold.deleteMany({ where: { eventId } })
await db.event.deleteMany({ where: { id: eventId } })
await db.$disconnect()

console.log('hold-api.test: PASS')
