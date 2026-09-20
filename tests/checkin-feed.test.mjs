import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/checkin/route.ts', 'utf8')

// GET denetim akisi mevcut
assert(route.includes('export async function GET'), 'GET handler olmali')
assert(route.includes('can.readEvents'), 'read gate olmali')
assert(route.includes('occurrenceId'), 'occurrence filtresi olmali')
assert(route.includes('operatorId: row.operatorId'), 'operator alani donmeli')
assert(route.includes('direction: row.direction'), 'yon alani donmeli')
assert(route.includes('take: 100'), 'limit bounded olmali')

// POST scan kurallari degismedi
assert(route.includes('scanSchema'), 'POST semasi korunmali')
assert(route.includes('direction'), 'POST yon destegi korunmali')

// Canli: anon sizdirmadan 401
const anon = await fetch('http://127.0.0.1:3000/api/checkin?occurrenceId=x')
assert(anon.status === 401, `anon GET 401 olmali, got ${anon.status}`)

// Canli failure path: demo login ile bogus occurrence 404 (salt-okunur)
const login = await fetch('http://127.0.0.1:3000/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@mavenforms.com', password: 'demo1234' }) })
const session = await login.json().catch(() => ({}))
assert(login.status === 200 && session.data?.token, 'demo login 200 olmali')
const bogus = await fetch('http://127.0.0.1:3000/api/checkin?occurrenceId=does-not-exist', { headers: { Authorization: `Bearer ${session.data.token}` } })
assert(bogus.status === 404, `bogus occurrence 404 olmali, got ${bogus.status}`)

console.log('checkin-feed.test: PASS (denetim akisi + 401/404 kilitli)')
