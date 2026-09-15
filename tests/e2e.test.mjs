import assert from 'node:assert'

const base = process.env.BASE || 'http://127.0.0.1:3000'
async function get(path){
  const r = await fetch(base+path)
  return { status: r.status, text: await r.text() }
}
async function post(path, body, token){
  const h = { 'Content-Type':'application/json' }
  if (token) h['Authorization']=`Bearer ${token}`
  const r = await fetch(base+path, { method:'POST', headers: h, body: JSON.stringify(body) })
  return { status: r.status, json: await r.json().catch(()=>({})) }
}

const health = await get('/api/health')
assert(health.status===200, 'health 200')
const ready = await get('/api/ready')
assert(ready.status===200, 'ready 200')

// login
const login = await post('/api/auth/login', { email:'demo@mavenforms.com', password:'demo1234' })
assert(login.status===200 && login.json.data?.token, 'login 200')

const token = login.json.data.token
const me = await fetch(base+'/api/auth/me', { headers:{Authorization:`Bearer ${token}`}})
assert(me.status===200, 'me 200')

// public form
const pub = await get('/api/public/forms/tekno-zirvesi-2026')
assert(pub.status===200, 'public 200')
assert(!pub.text.includes('workspaceId') && !pub.text.includes('ownerId'), 'no leakage')

// Submission uses the unbounded survey fixture; the event fixture has a finite response limit
// and is intentionally allowed to reach that product limit during repeated local smoke runs.
const sub = await post('/api/public/forms/musteri-memnuniyet-2026/submissions', { name:'E2E', satisfaction:8, service_quality:'good', recommend:'probably' })
assert(sub.status===200, 'public submit 200')

console.log('e2e.test: PASS (AC-E2E-01)')
