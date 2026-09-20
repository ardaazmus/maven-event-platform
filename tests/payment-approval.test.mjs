import assert from 'node:assert'
import { db } from '../src/lib/db.ts'
import { hashPassword } from '../src/lib/auth.ts'

const base = 'http://127.0.0.1:3000'
async function login(email, password) {
  const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
  const j = await r.json()
  assert(r.status === 200 && j.data?.token, `login 200 for ${email}`)
  return j.data.token
}
async function patch(path, body, token) {
  const h = { 'Content-Type': 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  const r = await fetch(base + path, { method: 'PATCH', headers: h, body: JSON.stringify(body) })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}
async function post(path, body, token) {
  const h = { 'Content-Type': 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  const r = await fetch(base + path, { method: 'POST', headers: h, body: JSON.stringify(body) })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}

const tokenA = await login('demo@mavenforms.com', 'demo1234')
const me = await fetch(base + '/api/auth/me', { headers: { Authorization: `Bearer ${tokenA}` } }).then(r => r.json())
const wsId = me.data.workspace.id

const pay = await post('/api/payments', { amountMinor: 10000, currency: 'TRY', method: 'cash', reference: `F2-08-${Date.now()}` }, tokenA)
assert(pay.status === 201, `setup 201, got ${pay.status}`)
const pid = pay.json.data.id

// Self-approval -> 403 four-eyes
const self = await patch(`/api/payments/${pid}`, { action: 'confirm' }, tokenA)
assert(self.status === 403, `self-approve 403, got ${self.status}`)

// Second billing user approves -> 200
const emailB = `f208.${Date.now()}@example.com`
const userB = await db.user.create({ data: { email: emailB, name: 'F2-08 Approver', passwordHash: await hashPassword('Test1234!') } })
await db.workspaceMember.create({ data: { workspaceId: wsId, userId: userB.id, role: 'admin', status: 'active' } })
const tokenB = await login(emailB, 'Test1234!')
const ok = await patch(`/api/payments/${pid}`, { action: 'confirm' }, tokenB)
assert(ok.status === 200, `approve 200, got ${ok.status}`)
assert(ok.json.data?.status === 'confirmed', 'status confirmed')

// Repeat -> 409
const again = await patch(`/api/payments/${pid}`, { action: 'confirm' }, tokenB)
assert(again.status === 409, `repeat 409, got ${again.status}`)

// Cleanup synthetic rows (dev DB only)
await db.payment.deleteMany({ where: { id: pid } })
await db.session.deleteMany({ where: { userId: userB.id } })
await db.workspaceMember.deleteMany({ where: { userId: userB.id } })
await db.user.deleteMany({ where: { id: userB.id } })
await db.$disconnect()

console.log('payment-approval.test: PASS')
