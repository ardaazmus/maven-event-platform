import assert from 'node:assert'
import { db } from '../src/lib/db.ts'
import { hashPassword } from '../src/lib/auth.ts'

const base = 'http://127.0.0.1:3000'
const stamp = Date.now()
const email = `f121.${stamp}@example.com`

async function login(mail, pass) {
  const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: mail, password: pass }) })
  const j = await r.json()
  assert(r.status === 200 && j.data?.token, `login 200 for ${mail}`)
  return j.data.token
}
const get = (path, token, ws) => {
  const h = {}
  if (token) h.Authorization = `Bearer ${token}`
  if (ws) h['x-workspace-id'] = ws
  return fetch(base + path, { headers: h })
}

// Setup: ikinci workspace + çift üyelikli sentetik kullanıcı (dev DB, sonda silinir)
const demo = await db.user.findUnique({ where: { email: 'demo@mavenforms.com' }, select: { id: true } })
const wsA = await db.workspace.findFirst({ where: { slug: 'mavenforms-demo' }, select: { id: true } })
const wsB = await db.workspace.create({ data: { name: `F1-21 ${stamp}`, slug: `f121-${stamp}`, status: 'active' } })
const user = await db.user.create({ data: { email, name: 'F1-21 Dual', passwordHash: await hashPassword('Test1234!') } })
await db.workspaceMember.create({ data: { workspaceId: wsA.id, userId: user.id, role: 'viewer', status: 'active' } })
await db.workspaceMember.create({ data: { workspaceId: wsB.id, userId: user.id, role: 'viewer', status: 'active' } })
const otherEvent = await db.event.create({ data: { workspaceId: wsB.id, title: `F1-21 Other ${stamp}`, createdById: demo.id } })
const token = await login(email, 'Test1234!')

try {
  // Çift üyelik + claimsiz -> 401 (belirsiz bağlam reddedilir)
  const noClaim = await get('/api/events', token)
  assert(noClaim.status === 401, `claimsiz 401, got ${noClaim.status}`)

  // Yanlış claim -> 401
  const wrongClaim = await get('/api/events', token, 'does-not-exist')
  assert(wrongClaim.status === 401, `yanlış claim 401, got ${wrongClaim.status}`)

  // Doğru claim -> 200
  const claimed = await get('/api/events', token, wsA.id)
  assert(claimed.status === 200, `doğru claim 200, got ${claimed.status}`)

  // Tek üyelik etkilenmez: demo claimsiz 200
  const demoToken = await login('demo@mavenforms.com', 'demo1234')
  const demoRes = await get('/api/events', demoToken)
  assert(demoRes.status === 200, `tek üyelik 200, got ${demoRes.status}`)

  // Wrong-org kaynak -> 404 (bilgi sızdırmaz)
  const cross = await get(`/api/events/${otherEvent.id}`, demoToken)
  assert(cross.status === 404, `wrong-org 404, got ${cross.status}`)
} finally {
  await db.event.deleteMany({ where: { id: otherEvent.id } })
  await db.workspaceMember.deleteMany({ where: { userId: user.id } })
  await db.session.deleteMany({ where: { userId: user.id } })
  await db.user.deleteMany({ where: { id: user.id } })
  await db.workspace.deleteMany({ where: { id: wsB.id } })
  await db.$disconnect()
}

console.log('org-context.test: PASS')
