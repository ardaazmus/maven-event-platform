import assert from 'node:assert'
import { db } from '../src/lib/db.ts'

// PILOT-R1-E2E: tek event uçtan uca pilot (CANLI: koşan server + seed DB).
// Zincir: Event → Occurrence → Form/Binding → Person → Registration → Ticket
// → Check-in → Hold → Readiness. Sentetik satırlar test içinde temizlenir.

const base = 'http://127.0.0.1:3000'
const tag = Date.now()
async function login() {
  const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@mavenforms.com', password: 'demo1234' }) })
  const j = await r.json()
  assert(r.status === 200 && j.data?.token, 'login 200')
  return j.data.token
}
const token = await login()
const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
const call = async (method, path, body) => {
  const r = await fetch(base + path, { method, headers: auth, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}

// 1. Event
const ev = await call('POST', '/api/events', { title: `Pilot Event ${tag}` })
assert(ev.status === 201, `event 201, got ${ev.status}`)
const eventId = ev.json.data.id

// 2. Occurrence + readiness setup gate
const occ = await call('POST', `/api/events/${eventId}/occurrences`, {
  venue: 'Pilot Salon', hall: 'A', startsAt: new Date(Date.now() + 86400_000).toISOString(), endsAt: new Date(Date.now() + 90000_000).toISOString(),
})
assert(occ.status === 201, `occurrence 201, got ${occ.status}`)
const ready1 = await call('GET', `/api/events/${eventId}/readiness`)
assert(ready1.status === 200 && ready1.json.data.gates.setup === true, 'setup gate acilmali')

// 3. Form + registration binding
const form = await call('POST', '/api/forms', { title: `Pilot Form ${tag}`, slug: `pilot-${tag}` })
assert(form.status === 200, `form 200, got ${form.status}`)
const bind = await call('POST', `/api/events/${eventId}/bindings`, { formId: form.json.data.id, purpose: 'registration' })
assert(bind.status === 201, `binding 201, got ${bind.status}`)

// 4. Person (normalize kanıtı: karışık-case email) + Registration
const per = await call('POST', '/api/persons', { fullName: '  Pilot  Katılımcı ', email: `Pilot.${tag}@Example.COM` })
assert(per.status === 201, `person 201, got ${per.status}`)
const stored = await db.person.findUnique({ where: { id: per.json.data.id } })
assert(stored?.email === `pilot.${tag}@example.com`, `email normalize saklanmali, got ${stored?.email}`)
assert(stored?.fullName === 'Pilot Katılımcı', 'isim normalize saklanmali')
const reg = await call('POST', '/api/registrations', { eventId, personId: per.json.data.id })
assert(reg.status === 201, `registration 201, got ${reg.status}`)
assert((await db.registrationHistory.count({ where: { registrationId: reg.json.data.id } })) >= 1, 'registration audit yazilmali')

// 5. Ticket + Check-in
const tick = await call('POST', `/api/registrations/${reg.json.data.id}/ticket`, {})
assert(tick.status === 201, `ticket 201, got ${tick.status}`)
const scan = await call('POST', '/api/checkin', { qrCode: tick.json.data.qrCode, direction: 'entry', gate: 'pilot-gate', deviceId: 'pilot-device-1' })
assert(scan.status === 201, `checkin 201, got ${scan.status}`)
const dup = await call('POST', '/api/checkin', { qrCode: tick.json.data.qrCode, direction: 'entry', gate: 'pilot-gate', deviceId: 'pilot-device-1' })
assert(dup.status === 409, `duplicate checkin 409, got ${dup.status}`)

// 6. Hold + readiness hold gate
const hold = await call('POST', `/api/events/${eventId}/holds`, { spaceRef: `PILOT-${tag}`, ttlMinutes: 30 })
assert(hold.status === 201, `hold 201, got ${hold.status}`)
assert(hold.json.data.holdToken, 'hold token donmeli')
const ready2 = await call('GET', `/api/events/${eventId}/readiness`)
assert(ready2.json.data.gates.hold === true, 'hold gate acilmali')
assert(ready2.json.data.counts.registrations >= 1, 'readiness kayit saymali')

// 7. Cleanup (çocuk → ebeveyn)
await db.checkInEvent.deleteMany({ where: { credential: { ticket: { registrationId: reg.json.data.id } } } })
await db.credential.deleteMany({ where: { ticket: { registrationId: reg.json.data.id } } })
await db.ticket.deleteMany({ where: { registrationId: reg.json.data.id } })
await db.registrationHistory.deleteMany({ where: { registrationId: reg.json.data.id } })
await db.registration.deleteMany({ where: { id: reg.json.data.id } })
await db.person.deleteMany({ where: { id: per.json.data.id } })
await db.inventoryHold.deleteMany({ where: { eventId } })
await db.eventFormBinding.deleteMany({ where: { eventId } })
await db.eventOccurrence.deleteMany({ where: { eventId } })
await db.form.deleteMany({ where: { id: form.json.data.id } })
await db.event.deleteMany({ where: { id: eventId } })
await db.$disconnect()

console.log('pilot-e2e.test: PASS (event→occurrence→form→person→registration→ticket→checkin→hold)')
