import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/events/[id]/holds/route.ts', 'utf8')

// GET listesi mevcut
assert(route.includes('export async function GET'), 'GET handler olmali')
assert(route.includes('can.readEvents'), 'read gate olmali')
assert(route.includes('assertEventReadable(event'), 'event scope dogrulamasi olmali')
assert(route.includes('take: 100'), 'limit bounded olmali')

// holdToken asla listelenmez (booking capability)
const getBlock = route.slice(route.indexOf('export async function GET'), route.indexOf('export async function POST'))
assert(!getBlock.toLowerCase().includes('holdtoken'), 'GET blogu token sizdirmamali')
assert(getBlock.includes('expiresAt'), 'vade alani donmeli')
assert(getBlock.includes('status'), 'durum alani donmeli')

// POST hold kurallari degismedi
assert(route.includes('holdSchema'), 'POST semasi korunmali')
assert(route.includes('ttlMinutes'), 'POST ttl destegi korunmali')

// Canli: anon sizdirmadan 401
const anon = await fetch('http://127.0.0.1:3000/api/events/does-not-exist/holds')
assert(anon.status === 401, `anon GET 401 olmali, got ${anon.status}`)

// Canli failure path: demo login ile bogus event 404 (salt-okunur)
const login = await fetch('http://127.0.0.1:3000/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@mavenforms.com', password: 'demo1234' }) })
const session = await login.json().catch(() => ({}))
assert(login.status === 200 && session.data?.token, 'demo login 200 olmali')
const bogus = await fetch('http://127.0.0.1:3000/api/events/does-not-exist/holds', { headers: { Authorization: `Bearer ${session.data.token}` } })
assert(bogus.status === 404, `bogus event 404 olmali, got ${bogus.status}`)

console.log('hold-list.test: PASS (rezervasyon listesi + token korumasi kilitli)')
