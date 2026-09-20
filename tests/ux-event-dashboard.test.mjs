import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const view = readFileSync('src/components/mavenforms/views/event-dashboard-view.tsx', 'utf8')
const types = readFileSync('src/lib/types.ts', 'utf8')
const shell = readFileSync('src/components/mavenforms/app-shell.tsx', 'utf8')
const list = readFileSync('src/components/mavenforms/views/event-list-view.tsx', 'utf8')

// Tip + shell baglantisi
assert(types.includes("| 'event-dashboard'"), 'AppView event-dashboard tasimali')
assert(shell.includes('<EventDashboardView />'), 'shell dashboard render etmeli')

// Dashboard gercek readiness API okur, 8 kapiyi cizer
assert(view.includes('/readiness'), 'dashboard readiness endpointini cagirmali')
for (const label of ['Kurulum', 'Form bağlantısı', 'Kayıt', 'Sipariş', 'Bilet', 'Floor plan', 'Program', 'Rezervasyon']) {
  assert(view.includes(label), `kapi etiketi olmali: ${label}`)
}
assert(view.includes('Kurulum readiness:'), 'acik-kapi sayisi olmali')

// Olmayan veri gosterilmez (finans/badge/check-in rakami yok)
assert(!view.includes('confirmed') && !view.includes('reconciliation'), 'finans rakami uydurulmamali')
assert(!view.includes('generated'), 'badge rakami uydurulmamali')

// Secim-yok ve hata durumlari
assert(view.includes('Önce etkinlik seçin'), 'secim-yok gerekcesi olmali')
assert(view.includes('Özet alınamadı'), 'hata durumu olmali')

// Liste Ozet akisi
assert(list.includes("setView('event-dashboard')"), 'liste ozete goturmeli')

// Mutation yok
assert(!view.includes('POST') && !view.includes('method:'), 'dashboard yalniz GET yapmali')

console.log('ux-event-dashboard.test: PASS (ozet kapilari kilitli)')
