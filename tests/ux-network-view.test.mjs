import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/events/[id]/leads/route.ts', 'utf8')
const view = readFileSync('src/components/mavenforms/views/network-view.tsx', 'utf8')
const types = readFileSync('src/lib/types.ts', 'utf8')
const sidebar = readFileSync('src/components/mavenforms/sidebar.tsx', 'utf8')
const shell = readFileSync('src/components/mavenforms/app-shell.tsx', 'utf8')

// Route: yalniz GET, session + event scope kilitli
assert(route.includes('export async function GET'), 'GET handler olmali')
assert(!route.includes('export async function POST'), 'mutation handler olmamali')
assert(!route.includes('export async function PUT'), 'mutation handler olmamali')
assert(!route.includes('export async function DELETE'), 'mutation handler olmamali')
assert(!route.includes('export async function PATCH'), 'mutation handler olmamali')
assert(route.includes('getSessionFromCookie'), 'session istemeli')
assert(route.includes('can.readEvents'), 'read gate tasimali')
assert(route.includes('assertEventReadable'), 'event scope dogrulanmali')
assert(route.includes('ctx.workspace.id'), 'tenant scope tasimali')
assert(route.includes('take: 100'), 'limit bounded olmali')
assert(route.includes('fullName'), 'lead alanlari donmeli')

// View: event guard + durumlar + endpoint
assert(view.includes('data-testid="network-view"'), 'panel test kimligi tasimali')
assert(view.includes('/leads'), 'lead endpointini cagirmali')
assert(view.includes('Önce etkinlik seçin'), 'event-gerekcesi olmali')
assert(view.includes('Leadler yükleniyor'), 'yukleme durumu olmali')
assert(view.includes('lead yok'), 'bos durum olmali')
assert(view.includes('if (!selectedEventId) return'), 'erken-cikis guard seklinde olmali')
assert(!view.includes("method: 'POST'"), 'view mutation yapmamali')
assert(!view.includes("method: 'PUT'"), 'view mutation yapmamali')
assert(!view.includes("method: 'DELETE'"), 'view mutation yapmamali')

// Wiring: tip + menu + shell
assert(types.includes("| 'network'"), 'AppView network tasimali')
assert(sidebar.includes("id: 'network'") && sidebar.includes('Leadler'), 'sidebar Leadler ogesi tasimali')
assert(shell.includes('<NetworkView />'), 'shell network render etmeli')

console.log('ux-network-view.test: PASS (lead salt-okunur kilitli)')
