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

// Setup: order 50000 + request with order + approve
const ord = await post('/api/orders', { currency: 'TRY', items: [{ description: 'Bilet', quantity: 1, unitAmountMinor: 50000, currency: 'TRY' }] })
assert(ord.status === 201, `setup order 201, got ${ord.status}`)
const orderId = ord.json.data.id
const req = await post('/api/invoice-requests', { orderId, recipientType: 'corporate', legalName: 'Acme', taxNumber: '111' })
assert(req.status === 201, `setup request 201, got ${req.status}`)
const ap = await post(`/api/invoice-requests/${req.json.data.id}/approve`, {})
assert(ap.status === 201, `setup approve 201, got ${ap.status}`)
const invId = ap.json.data.id

// Tamper order total after invoice created -> issue must block
await db.orderItem.create({ data: { orderId, description: 'Ekstra', quantity: 1, unitAmountMinor: 1000, currency: 'TRY', snapshotJson: '{}' } })
const blocked = await post(`/api/invoices/${invId}/issue`, {})
assert(blocked.status === 422, `mismatch 422, got ${blocked.status}`)

// Restore total -> issue ok
await db.orderItem.deleteMany({ where: { orderId, description: 'Ekstra' } })
const issued = await post(`/api/invoices/${invId}/issue`, {})
assert(issued.status === 200, `issue 200, got ${issued.status}`)
assert(issued.json.data?.number, 'number assigned')
assert(issued.json.data?.status === 'issued', 'status issued')

// Cleanup synthetic rows
await db.invoice.deleteMany({ where: { id: invId } })
await db.invoiceRequest.deleteMany({ where: { id: req.json.data.id } })
await db.order.deleteMany({ where: { id: orderId } })
await db.$disconnect()

console.log('invoice-issue.test: PASS')
