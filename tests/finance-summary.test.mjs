import assert from 'node:assert'

const base = 'http://127.0.0.1:3000'
async function login() {
  const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@mavenforms.com', password: 'demo1234' }) })
  const j = await r.json()
  assert(r.status === 200 && j.data?.token, 'login 200')
  return j.data.token
}

const anon = await fetch(base + '/api/finance/summary')
assert(anon.status === 401, `anon 401, got ${anon.status}`)

const token = await login()
const r = await fetch(base + '/api/finance/summary', { headers: { Authorization: `Bearer ${token}` } })
assert(r.status === 200, `summary 200, got ${r.status}`)
const j = await r.json()
assert(Array.isArray(j.data?.currencies), 'currencies array')
for (const c of j.data.currencies) {
  assert(typeof c.currency === 'string' && typeof c.collectedMinor === 'number', 'currency row shape')
  assert(typeof c.openMinor === 'number' && typeof c.unallocatedMinor === 'number', 'balance rows')
}

console.log('finance-summary.test: PASS')
