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

const req = await post('/api/invoice-requests', { recipientType: 'individual', legalName: 'Test Kişi', identityNumber: '10000000146' })
assert(req.status === 201, `setup request 201, got ${req.status}`)
const reqId = req.json.data.id

const ap = await post(`/api/invoice-requests/${reqId}/approve`, {})
assert(ap.status === 201, `approve 201, got ${ap.status}`)
const invId = ap.json.data?.id
assert(invId, 'invoice id')
const inv = await db.invoice.findUnique({ where: { id: invId } })
assert(inv?.status === 'data_review', `invoice data_review, got ${inv?.status}`)
const updated = await db.invoiceRequest.findUnique({ where: { id: reqId } })
assert(updated?.status === 'approved', 'request approved')

const again = await post(`/api/invoice-requests/${reqId}/approve`, {})
assert(again.status === 409, `repeat 409, got ${again.status}`)

await db.invoice.deleteMany({ where: { id: invId } })
await db.invoiceRequest.deleteMany({ where: { id: reqId } })
await db.$disconnect()

console.log('invoice-approve.test: PASS')
