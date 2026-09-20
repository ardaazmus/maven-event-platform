import assert from 'node:assert'
import { db } from '../src/lib/db.ts'

const base = 'http://127.0.0.1:3000'
async function login() {
  const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@mavenforms.com', password: 'demo1234' }) })
  const j = await r.json()
  assert(r.status === 200 && j.data?.token, 'login 200')
  return j.data.token
}
const token = await login()
const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
const call = async (method, path, body) => {
  const r = await fetch(base + path, { method, headers: body ? auth : { Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}

// Setup: event + published seed form + binding
const ev = await call('POST', '/api/events', { title: `F1-17 Orch ${Date.now()}` })
assert(ev.status === 201, `setup event 201, got ${ev.status}`)
const eventId = ev.json.data.id
const slug = 'musteri-memnuniyet-2026'
const forms = await fetch(base + '/api/forms', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
const form = forms.data?.find((f) => f.slug === slug)
assert(form, 'seed form exists')
const bind = await call('POST', `/api/events/${eventId}/bindings`, { formId: form.id, purpose: 'registration' })
assert(bind.status === 201, `bind 201, got ${bind.status}`)

// Build valid payload from public snapshot
const pub = await fetch(base + `/api/public/forms/${slug}`).then(r => r.json())
const email = `f117.${Date.now()}@example.com`
const payload = {}
for (const f of pub.data.fields) {
  if (f.type === 'email') payload[f.fieldKey] = email
  else if (f.type === 'checkbox') payload[f.fieldKey] = true
  else if (f.type === 'radio' || f.type === 'select') payload[f.fieldKey] = f.config?.options?.[0]?.value
  else if (f.type === 'rating' || f.type === 'number') payload[f.fieldKey] = 5
  else if (f.required) payload[f.fieldKey] = 'Test Verisi'
}
const sub = await fetch(base + `/api/public/forms/${slug}/submissions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `f117-${Date.now()}` },
  body: JSON.stringify(payload),
})
assert(sub.status === 200, `submit 200, got ${sub.status}`)

// Registration must exist for event+person
const regs = await db.registration.findMany({ where: { eventId }, include: { person: true, history: true } })
assert(regs.length === 1, `1 registration, got ${regs.length}`)
assert(regs[0].person?.id, 'person linked')
assert(regs[0].history.length === 1 && regs[0].history[0].toStatus === 'submitted', 'history submitted')
const personIds = regs.map((r) => r.person.id)

// Unbound form submit creates no registration: unbind then resubmit
const unbind = await fetch(base + `/api/events/${eventId}/bindings`, { method: 'DELETE', headers: auth, body: JSON.stringify({ formId: form.id }) })
assert(unbind.status === 200, `unbind 200, got ${unbind.status}`)
const email2 = `f117b.${Date.now()}@example.com`
const payload2 = { ...payload }
for (const f of pub.data.fields) if (f.type === 'email') payload2[f.fieldKey] = email2
const sub2 = await fetch(base + `/api/public/forms/${slug}/submissions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `f117b-${Date.now()}` },
  body: JSON.stringify(payload2),
})
assert(sub2.status === 200, `second submit 200, got ${sub2.status}`)
const regsAfter = await db.registration.count({ where: { eventId } })
assert(regsAfter === 1, `still 1 registration, got ${regsAfter}`)

// Cleanup synthetic rows (dev DB only)
const subRows = await db.submission.findMany({ where: { values: { some: { normalizedText: email } } }, select: { id: true } })
await db.submission.deleteMany({ where: { id: { in: subRows.map((s) => s.id) } } })
const subRows2 = await db.submission.findMany({ where: { values: { some: { normalizedText: email2 } } }, select: { id: true } })
await db.submission.deleteMany({ where: { id: { in: subRows2.map((s) => s.id) } } })
await db.registration.deleteMany({ where: { eventId } })
await db.event.deleteMany({ where: { id: eventId } })
await db.person.deleteMany({ where: { id: { in: personIds } } })
await db.$disconnect()

console.log('registration-orchestration.test: PASS')
