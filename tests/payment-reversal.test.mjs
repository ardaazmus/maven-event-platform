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
const tokenA = await login('demo@mavenforms.com', 'demo1234')
const me = await fetch(base + '/api/auth/me', { headers: { Authorization: `Bearer ${tokenA}` } }).then(r => r.json())
const wsId = me.data.workspace.id
const call = async (method, path, body, token) => {
  const h = { 'Content-Type': 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  const r = await fetch(base + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}

// Setup: payment + approve via second user
const pay = await call('POST', '/api/payments', { amountMinor: 20000, currency: 'TRY', method: 'cash', reference: `F2-11-${Date.now()}` }, tokenA)
assert(pay.status === 201, `setup 201, got ${pay.status}`)
const pid = pay.json.data.id
const emailB = `f211.${Date.now()}@example.com`
const userB = await db.user.create({ data: { email: emailB, name: 'F2-11 Approver', passwordHash: await hashPassword('Test1234!') } })
await db.workspaceMember.create({ data: { workspaceId: wsId, userId: userB.id, role: 'admin', status: 'active' } })
const tokenB = await login(emailB, 'Test1234!')
const ap = await call('PATCH', `/api/payments/${pid}`, { action: 'confirm' }, tokenB)
assert(ap.status === 200, `approve 200, got ${ap.status}`)

// Reversal -> original reversed + linked row
const rev = await call('POST', `/api/payments/${pid}/reversal`, { reason: 'Yanlış tutar' }, tokenB)
assert(rev.status === 201, `reversal 201, got ${rev.status}`)
const counterId = rev.json.data?.id
assert(counterId, 'counter-row id')
const orig = await db.payment.findUnique({ where: { id: pid } })
assert(orig.status === 'reversed', `original reversed, got ${orig.status}`)
const counter = await db.payment.findUnique({ where: { id: counterId } })
assert(counter?.reversalOfId === pid, 'counter links original')

// Double reversal -> 409
const again = await call('POST', `/api/payments/${pid}/reversal`, {}, tokenB)
assert(again.status === 409, `double 409, got ${again.status}`)

// Cleanup synthetic rows
await db.payment.deleteMany({ where: { id: { in: [pid, counterId] } } })
await db.session.deleteMany({ where: { userId: userB.id } })
await db.workspaceMember.deleteMany({ where: { userId: userB.id } })
await db.user.deleteMany({ where: { id: userB.id } })
await db.$disconnect()

console.log('payment-reversal.test: PASS')
