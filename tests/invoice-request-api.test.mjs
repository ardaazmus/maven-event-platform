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

const anon = await post('/api/invoice-requests', { recipientType: 'corporate' })
assert(anon.status === 401, `anon 401, got ${anon.status}`)

const token = await login()
const noTax = await post('/api/invoice-requests', { recipientType: 'corporate', legalName: 'Acme' }, token)
assert(noTax.status === 400, `no-tax 400, got ${noTax.status}`)

const created = await post('/api/invoice-requests', { recipientType: 'corporate', legalName: 'Acme Ltd', taxNumber: '1234567890', email: 'fatura@example.com' }, token)
assert(created.status === 201, `valid 201, got ${created.status}`)
const id = created.json.data?.id
assert(id, 'returns id')
assert(created.json.data?.status === 'requested', 'status requested')

await db.invoiceRequest.deleteMany({ where: { id } })
await db.$disconnect()

console.log('invoice-request-api.test: PASS')
