import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const types = readFileSync('src/lib/types.ts', 'utf8')
const sidebar = readFileSync('src/components/mavenforms/sidebar.tsx', 'utf8')
const view = readFileSync('src/components/mavenforms/views/registration-inbox-view.tsx', 'utf8')
const shell = readFileSync('src/components/mavenforms/app-shell.tsx', 'utf8')

// Tip + menu + shell baglantisi
assert(types.includes("| 'registrations'"), 'AppView registrations tasimali')
assert(sidebar.includes("id: 'registrations'") && sidebar.includes('Kayıtlar'), 'sidebar Kayitlar ogesi tasimali')
assert(shell.includes('<RegistrationInboxView />'), 'shell inbox gorunumunu render etmeli')

// Inbox secili eventten okur, secim-yokken cekmez
assert(view.includes('selectedEventId'), 'inbox baglami okumali')
assert(view.includes('Önce etkinlik seçin'), 'secim-yok gerekcesi olmali')
assert(view.includes('/api/registrations?eventId='), 'inbox endpointini eventId ile cagirmali')
assert(view.includes('row.person.fullName'), 'satir kisi adi gostermeli')
assert(view.includes('Bu etkinlikte kayıt yok'), 'bos durumu olmali')
assert(view.includes('Kayıtlar yükleniyor'), 'yukleniyor durumu olmali')

// Mutation yok
assert(!view.includes('POST') && !view.includes('method:'), 'inbox yalniz GET yapmali')
assert(view.includes('salt-okunur'), 'salt-okunur notu olmali')

console.log('ux-registration-inbox-view.test: PASS (inbox gorunumu kilitli)')
