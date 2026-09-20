import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const view = readFileSync('src/components/mavenforms/views/checkin-view.tsx', 'utf8')
const types = readFileSync('src/lib/types.ts', 'utf8')
const sidebar = readFileSync('src/components/mavenforms/sidebar.tsx', 'utf8')
const shell = readFileSync('src/components/mavenforms/app-shell.tsx', 'utf8')

// Tip + menu + shell baglantisi
assert(types.includes("| 'checkin'"), 'AppView checkin tasimali')
assert(sidebar.includes("id: 'checkin'") && sidebar.includes('Check-in'), 'sidebar Check-in ogesi tasimali')
assert(shell.includes('<CheckinView />'), 'shell akis gorunumunu render etmeli')

// Akis baglamli: event -> oturum -> besleme
assert(view.includes('selectedEventId'), 'event baglami okunmali')
assert(view.includes('/occurrences'), 'oturum listesi gercek API olmali')
assert(view.includes('/api/checkin?occurrenceId='), 'besleme gercek API olmali')
assert(view.includes('Giriş') && view.includes('Çıkış'), 'yon rozetleri olmali')
assert(view.includes('Önce etkinlik seçin'), 'event-gerekcesi olmali')
assert(view.includes('oturum seçin') || view.includes('Oturum seçin'), 'oturum-gerekcesi olmali')

// Mutation yok; tarama girisi ayri
assert(!view.includes('POST') && !view.includes('method:'), 'akis yalniz GET yapmali')
assert(view.includes('ayrı adımdır') || view.includes('ayri'), 'tarama-ayriligi notu olmali')

console.log('ux-checkin-view.test: PASS (operator akisi kilitli)')
