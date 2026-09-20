import assert from 'node:assert'

const base = 'http://127.0.0.1:3000'
async function login() {
  const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@mavenforms.com', password: 'demo1234' }) })
  const j = await r.json()
  assert(r.status === 200 && j.data?.token, 'login 200')
  return j.data.token
}

const anon = await fetch(base + '/api/finance/export.csv')
assert(anon.status === 401, `anon 401, got ${anon.status}`)

const token = await login()
const csv = await fetch(base + '/api/finance/export.csv', { headers: { Authorization: `Bearer ${token}` } })
assert(csv.status === 200, `export 200, got ${csv.status}`)
assert((csv.headers.get('content-type') || '').includes('text/csv'), 'csv content-type')
const text = await csv.text()
const lines = text.trim().split('\n')
assert(lines[0].includes('id') && lines[0].includes('amountMinor'), 'header row')

const summary = await fetch(base + '/api/finance/summary', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
const collectedCsv = lines.slice(1).filter(Boolean).reduce((sum, line) => {
  const cols = line.split(',').map((c) => c.replace(/^"|"$/g, ''))
  // id 0, method 1, source 2, currency 3, amountMinor 4, status 5
  return cols[5] === 'confirmed' ? sum + Number(cols[4]) : sum
}, 0)
const collectedSummary = (summary.data?.currencies || []).reduce((s, c) => s + c.collectedMinor, 0)
assert(collectedCsv === collectedSummary, `ledger/export equality ${collectedCsv} vs ${collectedSummary}`)

console.log('finance-export.test: PASS')
