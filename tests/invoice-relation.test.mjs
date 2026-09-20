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

async function makeRequest() {
  const req = await post('/api/invoice-requests', { recipientType: 'individual', legalName: 'K', identityNumber: '10000000146' })
  assert(req.status === 201, `setup request 201, got ${req.status}`)
  const ap = await post(`/api/invoice-requests/${req.json.data.id}/approve`, {})
  assert(ap.status === 201, `setup approve 201, got ${ap.status}`)
  return { reqId: req.json.data.id, invId: ap.json.data.id }
}

const a = await makeRequest()
const b = await makeRequest()

const rel = await post(`/api/invoices/${a.invId}/relations`, { targetInvoiceId: b.invId, type: 'replacement' })
assert(rel.status === 201, `relation 201, got ${rel.status}`)

const dup = await post(`/api/invoices/${a.invId}/relations`, { targetInvoiceId: b.invId, type: 'replacement' })
assert(dup.status === 409, `duplicate 409, got ${dup.status}`)

const self = await post(`/api/invoices/${a.invId}/relations`, { targetInvoiceId: a.invId, type: 'cancel' })
assert(self.status === 400, `self 400, got ${self.status}`)

const wrong = await post(`/api/invoices/${a.invId}/relations`, { targetInvoiceId: 'does-not-exist', type: 'credit' })
assert(wrong.status === 404, `wrong 404, got ${wrong.status}`)

await db.invoiceRelation.deleteMany({ where: { sourceInvoiceId: a.invId } })
await db.invoice.deleteMany({ where: { id: { in: [a.invId, b.invId] } } })
await db.invoiceRequest.deleteMany({ where: { id: { in: [a.reqId, b.reqId] } } })
await db.$disconnect()

console.log('invoice-relation.test: PASS')
