import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const store = readFileSync('src/lib/store.ts', 'utf8')
const bar = readFileSync('src/components/mavenforms/event-bar.tsx', 'utf8')
const shell = readFileSync('src/components/mavenforms/app-shell.tsx', 'utf8')
const route = readFileSync('src/app/api/events/route.ts', 'utf8')

// Store event baglami tasir
assert(store.includes('selectedEventId: string | null'), 'store secili event id tasimali')
assert(store.includes('selectEvent: (eventId: string | null) => void'), 'store selectEvent aksiyonu tasimali')
assert(store.includes('selectEvent: (eventId) => set({ selectedEventId: eventId })'), 'selectEvent state yazmali')

// EventBar gercek sozlesmeyi okur: GET /api/events -> { data: [{id,title,status}] }
assert(bar.includes("'/api/events'"), 'bar events endpointini cagirmali')
assert(route.includes('data: events.map'), 'route data dizisi donmeli')
assert(bar.includes('option.title') && bar.includes('selected.status'), 'bar baslik+durum gostermeli')

// Durumlar ayri: yukleniyor / hata / bos-secim
assert(bar.includes('Etkinlikler yükleniyor'), 'yukleniyor durumu olmali')
assert(bar.includes('Etkinlik listesi alınamadı'), 'hata durumu olmali')
assert(bar.includes('Etkinlik seçilmedi'), 'secim-yok durumu olmali')
assert(bar.includes('check-in, yaka kartı ve floor'), 'secim-yok nedeni yazmali')

// Bar mutation yapmaz
assert(!bar.includes('POST') && !bar.includes('method:'), 'bar yalniz GET yapmali')

// Shell bar kalici gostermeli
assert(shell.includes('<EventBar />'), 'shell EventBar render etmeli')
assert(shell.indexOf('<TopBar />') < shell.indexOf('<EventBar />'), 'bar topbar altinda olmali')

// Klavye/erisilebilirlik: labelled select
assert(bar.includes('aria-label="Etkinlik seç"'), 'select erisilebilir ad tasimali')

console.log('ux-shell-event-bar.test: PASS (event context + bar durumlari kilitli)')
