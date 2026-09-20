import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/events/[id]/readiness/route.ts', 'utf8')

// Sozlesme: auth + scope + sayim
assert(route.includes('export async function GET'), 'GET handler olmali')
assert(route.includes('can.readEvents'), 'readEvents gate olmali')
assert(route.includes('assertEventReadable(event'), 'event scope dogrulamasi olmali')
assert(route.includes('_count'), 'sayim read-modeli olmali')
for (const gate of ['setup:', 'formBinding:', 'registration:', 'order:', 'ticket:', 'floor:', 'program:', 'hold:']) {
  assert(route.includes(gate), `kapi olmali: ${gate}`)
}
assert(!route.includes('db.event.create') && !route.includes('.update(') && !route.includes('.delete'), 'salt-okunur olmali (mutation yok)')

// Canli: anon sizdirmadan 401 (bogus id ile de 401, auth oncelikli)
const anon = await fetch('http://127.0.0.1:3000/api/events/does-not-exist/readiness')
assert(anon.status === 401, `anon GET 401 olmali, got ${anon.status}`)

// Canli failure path: demo login ile bogus id 404 (salt-okunur)
const login = await fetch('http://127.0.0.1:3000/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@mavenforms.com', password: 'demo1234' }) })
const session = await login.json().catch(() => ({}))
assert(login.status === 200 && session.data?.token, 'demo login 200 olmali')
const bogus = await fetch('http://127.0.0.1:3000/api/events/does-not-exist/readiness', { headers: { Authorization: `Bearer ${session.data.token}` } })
assert(bogus.status === 404, `bogus id 404 olmali, got ${bogus.status}`)

console.log('event-readiness.test: PASS (kapi sozlesmesi + 401/404 kilitli)')
