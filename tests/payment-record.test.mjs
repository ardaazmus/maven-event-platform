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

const anon = await post('/api/payments', { amountMinor: 100 })
assert(anon.status === 401, `anon 401, got ${anon.status}`)

const token = await login()
const bad = await post('/api/payments', { amountMinor: -5, method: 'bank_transfer' }, token)
assert(bad.status === 400, `invalid 400, got ${bad.status}`)

const ref = `F2-06-${Date.now()}`
const created = await post('/api/payments', { amountMinor: 100000, currency: 'TRY', method: 'bank_transfer', reference: ref, valueDate: '2026-09-17T10:00:00Z' }, token)
assert(created.status === 201, `valid 201, got ${created.status}`)
const id = created.json.data?.id
assert(id, 'returns id')
assert(created.json.data?.status === 'recorded', 'status recorded')

const dup = await post('/api/payments', { amountMinor: 100000, currency: 'TRY', method: 'bank_transfer', reference: ref, valueDate: '2026-09-17T10:00:00Z' }, token)
assert(dup.status === 409, `duplicate 409, got ${dup.status}`)

await db.payment.deleteMany({ where: { id } })
await db.$disconnect()

console.log('payment-record.test: PASS')
