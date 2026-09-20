import assert from 'node:assert'
import { db } from '../src/lib/db.ts'
import { randomBytes } from 'node:crypto'

const base = 'http://127.0.0.1:3000'
async function login() {
  const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@mavenforms.com', password: 'demo1234' }) })
  const j = await r.json()
  assert(r.status === 200 && j.data?.token, 'login 200')
  return j.data.token
}
const token = await login()
const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
const post = async (path, body, key) => {
  const h = { ...auth }
  if (key) h['Idempotency-Key'] = key
  const r = await fetch(base + path, { method: 'POST', headers: h, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}

// Setup: request -> approve -> issue
const req = await post('/api/invoice-requests', { recipientType: 'individual', legalName: 'K', identityNumber: '10000000146' })
assert(req.status === 201, `setup request 201, got ${req.status}`)
const ap = await post(`/api/invoice-requests/${req.json.data.id}/approve`, {})
assert(ap.status === 201, `setup approve 201, got ${ap.status}`)
const invId = ap.json.data.id
const iss = await post(`/api/invoices/${invId}/issue`, {})
assert(iss.status === 200, `setup issue 200, got ${iss.status}`)

// Deliver -> 201 queued
const key = `f311-${Date.now()}-${randomBytes(4).toString('hex')}`
const del = await post(`/api/invoices/${invId}/deliveries`, { channel: 'email' }, key)
assert(del.status === 201, `deliver 201, got ${del.status}`)
const delId = del.json.data?.id
assert(delId, 'delivery id')
assert(del.json.data?.status === 'queued', 'status queued')

// Resend same key -> same row 200
const re = await post(`/api/invoices/${invId}/deliveries`, { channel: 'email' }, key)
assert(re.status === 200, `resend 200, got ${re.status}`)
assert(re.json.data?.id === delId, 'same row')

// Cleanup synthetic rows
await db.invoiceDelivery.deleteMany({ where: { id: delId } })
await db.invoice.deleteMany({ where: { id: invId } })
await db.invoiceRequest.deleteMany({ where: { id: req.json.data.id } })
await db.$disconnect()

console.log('invoice-delivery.test: PASS')
