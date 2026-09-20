import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/events/[id]/abstracts/route.ts', 'utf8')
const view = readFileSync('src/components/mavenforms/views/abstract-view.tsx', 'utf8')
const types = readFileSync('src/lib/types.ts', 'utf8')
const sidebar = readFileSync('src/components/mavenforms/sidebar.tsx', 'utf8')
const shell = readFileSync('src/components/mavenforms/app-shell.tsx', 'utf8')

// Route: GET + POST (-03 sozlesmesi), session + event scope kilitli
assert(route.includes('export async function GET'), 'GET handler olmali')
assert(route.includes('export async function POST'), 'POST handler olmali (-03)')
assert(!route.includes('export async function PUT'), 'mutation handler olmamali')
assert(!route.includes('export async function DELETE'), 'mutation handler olmamali')
assert(!route.includes('export async function PATCH'), 'mutation handler olmamali')
assert(route.includes('getSessionFromCookie'), 'session istemeli')
assert(route.includes('can.readEvents'), 'read gate tasimali')
assert(route.includes('assertEventReadable'), 'event scope dogrulanmali')
assert(route.includes('ctx.workspace.id'), 'tenant scope tasimali')
assert(route.includes('take: 100'), 'limit bounded olmali')

// Degerlendirme ozeti yalniz sayi/ortalama; hakem kimligi yok
assert(route.includes('reviewCount'), 'degerlendirme sayisi donmeli')
assert(route.includes('averageScore'), 'ortalama donmeli')
assert(!route.includes('reviewerId'), 'hakem kimligi sizmamali')

// View: event guard + durumlar + endpoint
assert(view.includes('data-testid="abstract-view"'), 'panel test kimligi tasimali')
assert(view.includes('/abstracts'), 'abstract endpointini cagirmali')
assert(view.includes('Önce etkinlik seçin'), 'event-gerekcesi olmali')
assert(view.includes('Bildiriler yükleniyor'), 'yukleme durumu olmali')
assert(view.includes('bildiri yok'), 'bos durum olmali')
assert(view.includes('if (!selectedEventId) return'), 'erken-cikis guard seklinde olmali')
assert(view.includes("method: 'POST'"), 'gonderme formu POST yapmali (-05)')
assert(!view.includes("method: 'PUT'"), 'view mutation yapmamali')
assert(!view.includes("method: 'DELETE'"), 'view mutation yapmamali')

// Wiring: tip + menu + shell
assert(types.includes("| 'abstracts'"), 'AppView abstracts tasimali')
assert(sidebar.includes("id: 'abstracts'") && sidebar.includes('Bildiriler'), 'sidebar Bildiriler ogesi tasimali')
assert(shell.includes('<AbstractView />'), 'shell abstract render etmeli')

console.log('ux-abstract-view.test: PASS (bildiri salt-okunur kilitli)')
