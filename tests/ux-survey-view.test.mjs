import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/events/[id]/surveys/route.ts', 'utf8')
const view = readFileSync('src/components/mavenforms/views/survey-view.tsx', 'utf8')
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
assert(route.includes('responseCount'), 'yanit sayisi donmeli')
assert(!route.includes('answersJson'), 'yanit govdesi sizmamali')

// View: event guard + durumlar + endpoint
assert(view.includes('data-testid="survey-view"'), 'panel test kimligi tasimali')
assert(view.includes('/surveys'), 'survey endpointini cagirmali')
assert(view.includes('Önce etkinlik seçin'), 'event-gerekcesi olmali')
assert(view.includes('Anketler yükleniyor'), 'yukleme durumu olmali')
assert(view.includes('anket yok'), 'bos durum olmali')
assert(view.includes('if (!selectedEventId) return'), 'erken-cikis guard seklinde olmali')
assert(view.includes("method: 'POST'"), 'olusturma formu POST yapmali (-05)')
assert(!view.includes("method: 'PUT'"), 'view mutation yapmamali')
assert(!view.includes("method: 'DELETE'"), 'view mutation yapmamali')

// Wiring: tip + menu + shell
assert(types.includes("| 'surveys'"), 'AppView surveys tasimali')
assert(sidebar.includes("id: 'surveys'") && sidebar.includes('Anketler'), 'sidebar Anketler ogesi tasimali')
assert(shell.includes('<SurveyView />'), 'shell survey render etmeli')

console.log('ux-survey-view.test: PASS (anket salt-okunur kilitli)')
