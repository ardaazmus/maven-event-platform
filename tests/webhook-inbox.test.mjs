import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/webhooks/events/route.ts', 'utf8')

// GET inbox mevcut
assert(route.includes('export async function GET'), 'GET handler olmali')
assert(route.includes('can.readInvoices'), 'finans okuma gate olmali')
assert(route.includes('processingStatus'), 'isleme durumu donmeli')
assert(route.includes('signatureVerified'), 'imza durumu donmeli')
assert(route.includes('take: 100'), 'limit bounded olmali')

// Ham payload ve secret yok
const low = route.toLowerCase()
assert(!low.includes('payload') || low.includes('ham provider payload asla'), 'ham payload donmemeli')
assert(!low.includes('secret') && !low.includes('signature') || low.includes('signatureverified'), 'secret tasiyan alan olmamali')
assert(!route.includes('rawBody') && !route.includes('raw_body'), 'ham govde okunmamali')

// Canli: anon sizdirmadan 401
const anon = await fetch('http://127.0.0.1:3000/api/webhooks/events?provider=stripe')
assert(anon.status === 401, `anon GET 401 olmali, got ${anon.status}`)

console.log('webhook-inbox.test: PASS (isleme durumu + 401 kilitli)')
