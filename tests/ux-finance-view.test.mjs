import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const view = readFileSync('src/components/mavenforms/views/finance-view.tsx', 'utf8')
const types = readFileSync('src/lib/types.ts', 'utf8')
const sidebar = readFileSync('src/components/mavenforms/sidebar.tsx', 'utf8')
const shell = readFileSync('src/components/mavenforms/app-shell.tsx', 'utf8')

// Tip + menu + shell baglantisi
assert(types.includes("| 'finance'"), 'AppView finance tasimali')
assert(sidebar.includes("id: 'finance'") && sidebar.includes('Finans'), 'sidebar Finans ogesi tasimali')
assert(shell.includes('<FinanceView />'), 'shell finans gorunumunu render etmeli')

// Ozet kartlari API degerlerini aynen gosterir (hesap yok)
assert(view.includes('/api/finance/summary'), 'ozet endpointini cagirmali')
for (const label of ['Tahsilat:', 'Açık borç:', 'Dağıtılmamış:', 'İnceleme bekleyen:']) {
  assert(view.includes(label), `kart etiketi olmali: ${label}`)
}
assert(view.includes('collectedMinor') && view.includes('openMinor'), 'API alanlari aynen kullanilmali')

// 403 yetki aciklamasi ayri durum
assert(view.includes('status === 403'), '403 ayirimi olmali')
assert(view.includes('finans rolü gerektirir'), 'yetki aciklamasi olmali')

// Mutation yok
assert(!view.includes('POST') && !view.includes('method:'), 'gorunum yalniz GET yapmali')

console.log('ux-finance-view.test: PASS (finans ozeti kilitli)')
