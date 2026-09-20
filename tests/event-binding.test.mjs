import assert from 'node:assert'
import { db } from '../src/lib/db.ts'

const base = 'http://127.0.0.1:3000'
async function login() {
  const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@mavenforms.com', password: 'demo1234' }) })
  const j = await r.json()
  assert(r.status === 200 && j.data?.token, 'login 200')
  return j.data.token
}
async function req(method, path, body, token) {
  const h = { 'Content-Type': 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  const r = await fetch(base + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}

const token = await login()
const ev = await req('POST', '/api/events', { title: `F1-16 Bind ${Date.now()}` }, token)
assert(ev.status === 201, `setup event 201, got ${ev.status}`)
const eventId = ev.json.data.id

const mkForm = await req('POST', '/api/forms', { title: `F1-16 Form ${Date.now()}`, slug: `f116-${Date.now()}` }, token)
assert(mkForm.status === 200, `setup form 200, got ${mkForm.status}`)
const formId = mkForm.json.data?.id
assert(formId, 'created form has id')

const bind = await req('POST', `/api/events/${eventId}/bindings`, { formId, purpose: 'registration' }, token)
assert(bind.status === 201, `bind 201, got ${bind.status}`)

const dup = await req('POST', `/api/events/${eventId}/bindings`, { formId, purpose: 'registration' }, token)
assert(dup.status === 409, `duplicate 409, got ${dup.status}`)

const wrong = await req('POST', `/api/events/${eventId}/bindings`, { formId: 'does-not-exist' }, token)
assert(wrong.status === 404, `wrong-form 404, got ${wrong.status}`)

// R3: ikinci evente registration binding 409; survey serbest
const ev2 = await req('POST', '/api/events', { title: `F1-22 Second ${Date.now()}` }, token)
assert(ev2.status === 201, `setup event2 201, got ${ev2.status}`)
const secondBind = await req('POST', `/api/events/${ev2.json.data.id}/bindings`, { formId, purpose: 'registration' }, token)
assert(secondBind.status === 409, `second registration 409, got ${secondBind.status}`)
const surveyBind = await req('POST', `/api/events/${ev2.json.data.id}/bindings`, { formId, purpose: 'survey' }, token)
assert(surveyBind.status === 201, `survey bind 201, got ${surveyBind.status}`)

const unbind = await req('DELETE', `/api/events/${eventId}/bindings`, { formId }, token)
assert(unbind.status === 200, `unbind 200, got ${unbind.status}`)

await db.event.deleteMany({ where: { id: { in: [eventId, ev2.json.data.id] } } })
await db.form.deleteMany({ where: { id: formId } })
await db.$disconnect()

console.log('event-binding.test: PASS')
