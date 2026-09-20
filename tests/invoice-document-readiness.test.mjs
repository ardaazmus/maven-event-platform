import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/invoices/[id]/documents/route.ts', 'utf8')

// GET readiness mevcut
assert(route.includes('export async function GET'), 'GET handler olmali')
assert(route.includes('can.readInvoices'), 'read gate olmali')
assert(route.includes('scanStatus'), 'tarama durumu donmeli')
assert(route.includes('sha256'), 'hash donmeli')
assert(route.includes('take: 100'), 'limit bounded olmali')

// Icerik ve storageKey GET yolunda yok
const getBlock = route.slice(route.indexOf('export async function GET'), route.indexOf('export async function POST'))
assert(!getBlock.includes('storageKey'), 'GET blogu storageKey sizdirmamali')
assert(!getBlock.includes('writeFile') && !getBlock.includes('readFile'), 'GET dosya IO yapmamali')

// Upload/tarama kurallari degismedi
assert(route.includes('validateInvoiceDocumentUpload'), 'upload dogrulama korunmali')
assert(route.includes('invoiceDocumentStoragePath'), 'storage yolu korunmali')

// Canli: anon sizdirmadan 401
const anon = await fetch('http://127.0.0.1:3000/api/invoices/does-not-exist/documents')
assert(anon.status === 401, `anon GET 401 olmali, got ${anon.status}`)

// Canli failure path: demo login ile bogus id 404 (salt-okunur)
const login = await fetch('http://127.0.0.1:3000/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@mavenforms.com', password: 'demo1234' }) })
const session = await login.json().catch(() => ({}))
assert(login.status === 200 && session.data?.token, 'demo login 200 olmali')
const bogus = await fetch('http://127.0.0.1:3000/api/invoices/does-not-exist/documents', { headers: { Authorization: `Bearer ${session.data.token}` } })
assert(bogus.status === 404, `bogus id 404 olmali, got ${bogus.status}`)

console.log('invoice-document-readiness.test: PASS (hazirlik listesi + 401/404 kilitli)')
