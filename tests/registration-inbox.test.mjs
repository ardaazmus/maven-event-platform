import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/registrations/route.ts', 'utf8')

// GET inbox mevcut
assert(route.includes('export async function GET'), 'GET handler olmali')
assert(route.includes("searchParams.get('eventId')"), 'eventId query okunmali')
assert(route.includes('eventId gerekli'), 'eventId yoksa 400 mesaji olmali')
assert(route.includes('assertEventReadable(event'), 'event scope dogrulamasi olmali')
assert(route.includes('workspaceId: ctx.workspace.id, eventId: event.id'), 'cift scope filtresi olmali')
assert(route.includes('take: 100'), 'limit bounded olmali')
assert(route.includes('person: { select:'), 'person join secimi olmali')

// POST create akisi degismedi
assert(route.includes("status: 'submitted'"), 'POST submitted durumu korunmali')
assert(route.includes('registrationHistory.create'), 'POST history yazimi korunmali')

// Canli: anon istek veri sizdirmadan 401 (sunucu local-ready ile ayakta)
const anon = await fetch('http://127.0.0.1:3000/api/registrations?eventId=x')
assert(anon.status === 401, `anon GET 401 olmali, got ${anon.status}`)
const anonNoQuery = await fetch('http://127.0.0.1:3000/api/registrations')
assert(anonNoQuery.status === 401, `anon query-siz GET 401 olmali, got ${anonNoQuery.status}`)

// Canli failure path: demo login ile 400/404 (salt-okunur, kalinti yok)
const login = await fetch('http://127.0.0.1:3000/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@mavenforms.com', password: 'demo1234' }) })
const session = await login.json().catch(() => ({}))
assert(login.status === 200 && session.data?.token, 'demo login 200 olmali')
const auth = { Authorization: `Bearer ${session.data.token}` }
const noId = await fetch('http://127.0.0.1:3000/api/registrations', { headers: auth })
assert(noId.status === 400, `eventId-siz GET 400 olmali, got ${noId.status}`)
const bogus = await fetch('http://127.0.0.1:3000/api/registrations?eventId=does-not-exist', { headers: auth })
assert(bogus.status === 404, `bogus event GET 404 olmali, got ${bogus.status}`)

console.log('registration-inbox.test: PASS (GET sozlesme + anon 401 + 400/404 kilitli)')
