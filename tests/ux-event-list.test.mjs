import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const types = readFileSync('src/lib/types.ts', 'utf8')
const sidebar = readFileSync('src/components/mavenforms/sidebar.tsx', 'utf8')
const view = readFileSync('src/components/mavenforms/views/event-list-view.tsx', 'utf8')
const shell = readFileSync('src/components/mavenforms/app-shell.tsx', 'utf8')
const route = readFileSync('src/app/api/events/route.ts', 'utf8')

// Tip + menu + shell baglantisi
assert(types.includes("| 'events'"), 'AppView events tasimali')
assert(sidebar.includes("id: 'events'") && sidebar.includes('Etkinlikler'), 'sidebar Etkinlikler ogesi tasimali')
assert(shell.includes('<EventListView />'), 'shell events gorunumunu render etmeli')

// Liste gercek sozlesmeyi okur
assert(view.includes("'/api/events'"), 'liste events endpointini cagirmali')
assert(route.includes('occurrenceCount'), 'route occurrence sayisi donmeli')
assert(view.includes('occurrenceCount'), 'liste occurrence sayisi gostermeli')
assert(view.includes('selectEvent(row.id)'), 'Sec dugmesi baglami yazmali')
assert(view.includes('Seçili bağlam'), 'secili satir isaretlenmeli')

// Durumlar ayri
assert(view.includes('Etkinlikler yükleniyor'), 'yukleniyor durumu olmali')
assert(view.includes('Henüz etkinlik yok'), 'bos durumu olmali')
assert(view.includes('Etkinlik listesi alınamadı'), 'hata durumu olmali')

// Event-first: GET listesi + birincil Yeni Etkinlik POST mutation birlikte
assert(view.includes("method: 'POST'") && view.includes("'/api/events'"), 'liste Yeni Etkinlik mutation tasimali')
assert(view.includes('Yeni Etkinlik'), 'birincil aksiyon gorunur olmali')
assert(view.includes('aria-label='), 'satir dugmeleri erisilebilir ad tasimali')

console.log('ux-event-list.test: PASS (etkinlik listesi + baglam secimi kilitli)')
