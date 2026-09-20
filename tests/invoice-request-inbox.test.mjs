import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/invoice-requests/route.ts', 'utf8')

// GET inbox mevcut ve PII-safe
assert(route.includes('export async function GET'), 'GET handler olmali')
assert(route.includes('can.readInvoices'), 'finans okuma gate olmali')
assert(route.includes('select: { id: true, orderId: true, recipientType: true, countryCode: true, status: true, createdAt: true }'), 'select PII-safe olmali')

// Sifreli alanlar ve e-posta GET yolunda okunamaz
const getBlock = route.slice(route.indexOf('export async function GET'), route.indexOf('export async function POST'))
for (const leak of ['Encrypted', 'email', 'legalName', 'taxNumber', 'identityNumber', 'billingAddress']) {
  assert(!getBlock.includes(leak), `GET blogu sizdirmamali: ${leak}`)
}

// POST PII sifreleme akisi degismedi
assert(route.includes('encryptInvoicePii'), 'POST sifreleme korunmali')

// Canli: anon sizdirmadan 401 (liste ve sekliyle)
const anon = await fetch('http://127.0.0.1:3000/api/invoice-requests')
assert(anon.status === 401, `anon GET 401 olmali, got ${anon.status}`)
const body = await anon.json().catch(() => ({}))
assert(!JSON.stringify(body).includes('Encrypted'), '401 govdesi PII tasimamali')

console.log('invoice-request-inbox.test: PASS (PII-safe liste + 401 kilitli)')
