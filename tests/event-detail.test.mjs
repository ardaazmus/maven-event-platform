import assert from 'node:assert'
import { db } from '../src/lib/db.ts'

const base = 'http://127.0.0.1:3000'
async function login() {
  const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@mavenforms.com', password: 'demo1234' }) })
  const j = await r.json()
  assert(r.status === 200 && j.data?.token, 'login 200')
  return { token: j.data.token, workspaceId: j.data.workspace?.id }
}

// Anon detail -> 401
const anon = await fetch(base + '/api/events/does-not-exist')
assert(anon.status === 401, `anon 401, got ${anon.status}`)

const { token } = await login()
const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

// Create synthetic event, read it back, then cleanup
const title = `F1-08 Detail ${Date.now()}`
const created = await fetch(base + '/api/events', { method: 'POST', headers: auth, body: JSON.stringify({ title }) })
assert(created.status === 201, `create 201, got ${created.status}`)
const { data } = await created.json()

const detail = await fetch(base + `/api/events/${data.id}`, { headers: { Authorization: `Bearer ${token}` } })
assert(detail.status === 200, `detail 200, got ${detail.status}`)
const dj = await detail.json()
assert(dj.data?.id === data.id && Array.isArray(dj.data?.occurrences), 'detail has occurrences')

// Unknown id in own scope -> 404 (no leak)
const missing = await fetch(base + '/api/events/does-not-exist', { headers: { Authorization: `Bearer ${token}` } })
assert(missing.status === 404, `missing 404, got ${missing.status}`)

await db.event.deleteMany({ where: { id: data.id } })
await db.$disconnect()

console.log('event-detail.test: PASS')
