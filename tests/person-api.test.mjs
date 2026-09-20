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

const anon = await fetch(base + '/api/persons')
assert(anon.status === 401, `anon 401, got ${anon.status}`)

// R1: viewer rolü kişi PII okuyamaz/yazamamaz (least privilege)
const viewerLogin = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'viewer_test@mavenforms.com', password: 'viewer1234' }) })
const viewerJson = await viewerLogin.json()
assert(viewerLogin.status === 200 && viewerJson.data?.token, 'viewer login 200')
const viewerToken = viewerJson.data.token
const viewerGet = await fetch(base + '/api/persons', { headers: { Authorization: `Bearer ${viewerToken}` } })
assert(viewerGet.status === 403, `viewer GET 403, got ${viewerGet.status}`)
const viewerPost = await post('/api/persons', { fullName: 'Nope' }, viewerToken)
assert(viewerPost.status === 403, `viewer POST 403, got ${viewerPost.status}`)

const token = await login()
const bad = await post('/api/persons', { fullName: '' }, token)
assert(bad.status === 400, `invalid 400, got ${bad.status}`)

const name = `F1-12 Person ${Date.now()}`
const created = await post('/api/persons', { fullName: name, email: 'f112@example.com' }, token)
assert(created.status === 201, `valid 201, got ${created.status}`)
const id = created.json.data?.id
assert(id, 'returns id')

const list = await fetch(base + '/api/persons', { headers: { Authorization: `Bearer ${token}` } })
assert(list.status === 200, 'list 200')
const lj = await list.json()
assert(lj.data?.some((p) => p.id === id), 'list contains created')

await db.person.deleteMany({ where: { id } })
await db.$disconnect()

console.log('person-api.test: PASS')
