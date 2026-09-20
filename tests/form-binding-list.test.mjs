import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/events/[id]/bindings/route.ts', 'utf8')

// GET listesi mevcut
assert(route.includes('export async function GET'), 'GET handler olmali')
assert(route.includes('loadEvent(id, ctx)'), 'GET scope yukleyiciyi kullanmali')
assert(route.includes('form: { select: { id: true, title: true } }'), 'form join baslik tasimali')
assert(route.includes('take: 100'), 'limit bounded olmali')

// POST/DELETE davranisi degismedi
assert(route.includes("error: 'Already bound'"), 'POST 409 kurali korunmali')
assert(route.includes("error: 'Form already bound to another event'"), 'POST capisma kurali korunmali')
assert(route.includes('export async function DELETE'), 'DELETE korunmali')

// Canli: anon sizdirmadan 401
const anon = await fetch('http://127.0.0.1:3000/api/events/does-not-exist/bindings')
assert(anon.status === 401, `anon GET 401 olmali, got ${anon.status}`)

// Canli failure path: demo login ile bogus id 404 (salt-okunur)
const login = await fetch('http://127.0.0.1:3000/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@mavenforms.com', password: 'demo1234' }) })
const session = await login.json().catch(() => ({}))
assert(login.status === 200 && session.data?.token, 'demo login 200 olmali')
const bogus = await fetch('http://127.0.0.1:3000/api/events/does-not-exist/bindings', { headers: { Authorization: `Bearer ${session.data.token}` } })
assert(bogus.status === 404, `bogus id 404 olmali, got ${bogus.status}`)

console.log('form-binding-list.test: PASS (liste sozlesmesi + 401/404 kilitli)')
