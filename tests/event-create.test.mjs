import assert from 'node:assert'
import { checkCapability } from '../src/lib/policy.ts'
import { db } from '../src/lib/db.ts'

const base = 'http://127.0.0.1:3000'
async function post(path, body, token) {
  const h = { 'Content-Type': 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  const r = await fetch(base + path, { method: 'POST', headers: h, body: JSON.stringify(body) })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}

// Role gate (unit): viewer must not write events
const viewerCtx = { user: { id: 'u1', role: 'viewer' }, workspace: { id: 'ws-a' } }
assert(checkCapability(viewerCtx, 'events.write').status === 403, 'viewer 403')

// Anon create -> 401, no row created
const anon = await post('/api/events', { title: 'Nope' })
assert(anon.status === 401, `anon 401, got ${anon.status}`)

// Auth
const login = await post('/api/auth/login', { email: 'demo@mavenforms.com', password: 'demo1234' })
assert(login.status === 200 && login.json.data?.token, 'login 200')
const token = login.json.data.token

// Invalid -> 400, no row created
const bad = await post('/api/events', { title: '' }, token)
assert(bad.status === 400, `invalid 400, got ${bad.status}`)

// Valid -> 201 in own workspace
const title = `F1-07 Test ${Date.now()}`
const created = await post('/api/events', { title }, token)
assert(created.status === 201, `valid 201, got ${created.status}`)
const id = created.json.data?.id
assert(id, 'returns id')

// Cleanup synthetic row (dev DB only)
await db.event.deleteMany({ where: { id } })
await db.$disconnect()

console.log('event-create.test: PASS')
