import assert from 'node:assert'
import { readFileSync } from 'node:fs'

// F2-R1: finans özeti runtime + manuel ödeme sözleşme kilidi (serverless static).
// Canlı approval/reversal kanıtı bun testleriyle verify içindedir.

const client = readFileSync('src/lib/api-client.ts', 'utf8')
const view = readFileSync('src/components/mavenforms/views/finance-view.tsx', 'utf8')
const summary = readFileSync('src/app/api/finance/summary/route.ts', 'utf8')
const payments = readFileSync('src/app/api/payments/route.ts', 'utf8')
const reversal = readFileSync('src/app/api/payments/[id]/reversal/route.ts', 'utf8')

// Tek-seviye çözüm, çift body.data yok
assert(client.includes('return data.data as T'), 'api tek seviyeyi acmali')
assert(view.includes('api<{ currencies: CurrencyRow[] }>'), 'ozet tek-seviye cozum kullanmali')
assert(!view.includes('{ data: { currencies'), 'ozet cift data cozumu yapmamali')
assert(view.includes("'/api/finance/summary'"), 'ozet endpointi korunmali')

// Salt-okunur niyet + rol kapısı görünürlüğü
assert(view.includes('salt-okunurdur'), 'salt-okunur niyeti yazmali')
assert(view.includes('finans rolü gerektirir'), 'rol gerekcesi olmali')
assert(view.includes('status === 403'), '403 ayrimi olmali')
assert(!view.includes('POST') && !view.includes('method:'), 'ozet yalniz GET yapmali')

// Özet route: billing gate + minor-unit + currencies zarfı
assert(summary.includes('can.manageBilling'), 'ozet billing gate olmali')
assert(summary.includes('currencies:'), 'ozet currencies donmeli')
for (const field of ['collectedMinor', 'openMinor', 'unallocatedMinor', 'pendingReviewMinor']) {
  assert(summary.includes(field), `ozet alani olmali: ${field}`)
}

// Ödeme hattı: manuel kayıt + reversal zinciri (davranış canlı testlerde)
assert(payments.includes('export async function POST'), 'odeme kayit olmali')
assert(reversal.includes('export async function POST'), 'reversal endpoint olmali')
assert(reversal.includes('reversalOfId') || reversal.includes('reversalOf'), 'reversal baglantisi olmali')

console.log('f2-finance-contract: PASS')
