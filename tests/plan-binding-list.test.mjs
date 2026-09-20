import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/events/[id]/plan-bindings/route.ts', 'utf8')

// GET listesi mevcut
assert(route.includes('export async function GET'), 'GET handler olmali')
assert(route.includes('can.readEvents'), 'read gate olmali')
assert(route.includes('assertEventReadable(event'), 'event scope dogrulamasi olmali')
assert(route.includes('planVersion'), 'surum alani donmeli')
assert(route.includes('take: 100'), 'limit bounded olmali')

// Geometri uretilmez
assert(!route.includes('geometry') && !route.includes('seats') && !route.includes('svg'), 'geometri uretilmemeli')

// Canli: anon sizdirmadan 401
const anon = await fetch('http://127.0.0.1:3000/api/events/does-not-exist/plan-bindings')
assert(anon.status === 401, `anon GET 401 olmali, got ${anon.status}`)

// Canli failure path: demo login ile bogus id 404 (salt-okunur)
const login = await fetch('http://127.0.0.1:3000/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@mavenforms.com', password: 'demo1234' }) })
const session = await login.json().catch(() => ({}))
assert(login.status === 200 && session.data?.token, 'demo login 200 olmali')
const bogus = await fetch('http://127.0.0.1:3000/api/events/does-not-exist/plan-bindings', { headers: { Authorization: `Bearer ${session.data.token}` } })
assert(bogus.status === 404, `bogus id 404 olmali, got ${bogus.status}`)

console.log('plan-binding-list.test: PASS (baglanti listesi + 401/404 kilitli)')
