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
const me = await fetch(base + '/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
const wsId = me.data.workspace.id
const meUser = await db.user.findUnique({ where: { email: 'demo@mavenforms.com' }, select: { id: true } })

// Setup: invoice + clean/pending assets (dev DB synthetic)
const req = await post('/api/invoice-requests', { recipientType: 'individual', legalName: 'K', identityNumber: '10000000146' })
assert(req.status === 201, `setup request 201, got ${req.status}`)
const ap = await post(`/api/invoice-requests/${req.json.data.id}/approve`, {})
const invId = ap.json.data.id
const clean = await db.mediaAsset.create({ data: { workspaceId: wsId, storageKey: `f314-clean-${Date.now()}`, originalName: 'doc.pdf', mime: 'application/pdf', size: 10, checksum: `c-${Date.now()}`, scanStatus: 'clean', visibility: 'private', createdById: meUser.id } })
const pending = await db.mediaAsset.create({ data: { workspaceId: wsId, storageKey: `f314-pend-${Date.now()}`, originalName: 'doc2.pdf', mime: 'application/pdf', size: 10, checksum: `p-${Date.now()}`, scanStatus: 'pending', visibility: 'private', createdById: meUser.id } })

const ok = await post(`/api/invoices/${invId}/document-links`, { mediaAssetId: clean.id })
assert(ok.status === 201, `attach 201, got ${ok.status}`)

const quar = await post(`/api/invoices/${invId}/document-links`, { mediaAssetId: pending.id })
assert(quar.status === 422, `pending 422, got ${quar.status}`)

const wrong = await post(`/api/invoices/${invId}/document-links`, { mediaAssetId: 'does-not-exist' })
assert(wrong.status === 404, `wrong 404, got ${wrong.status}`)

// Cleanup synthetic rows
await db.mediaAsset.deleteMany({ where: { id: { in: [clean.id, pending.id] } } })
await db.invoice.deleteMany({ where: { id: invId } })
await db.invoiceRequest.deleteMany({ where: { id: req.json.data.id } })
await db.$disconnect()

console.log('invoice-document.test: PASS')
