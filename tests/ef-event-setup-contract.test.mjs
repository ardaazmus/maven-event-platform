import assert from 'node:assert'
import { readFileSync } from 'node:fs'

// EF-02C: Event context + readiness/setup contract (serverless static assertions).
// Locks: api() single-level unwrap in EventBar + EventDashboardView,
// readiness 8-gate envelope, occurrence GET/POST contract.

const client = readFileSync('src/lib/api-client.ts', 'utf8')
const bar = readFileSync('src/components/mavenforms/event-bar.tsx', 'utf8')
const dashboard = readFileSync('src/components/mavenforms/views/event-dashboard-view.tsx', 'utf8')
const readiness = readFileSync('src/app/api/events/[id]/readiness/route.ts', 'utf8')
const occurrences = readFileSync('src/app/api/events/[id]/occurrences/route.ts', 'utf8')

// api() unwraps exactly one envelope level
assert(client.includes('return data.data as T'), 'api tek seviyeyi acmali')

// EventBar: single-level consume, no double unwrap
assert(bar.includes('api<EventOption[]>'), 'bar tek-seviye cozum kullanmali')
assert(!bar.includes('{ data: EventOption[] }'), 'bar cift data cozumu yapmamali')
assert(bar.includes("'/api/events'"), 'bar events endpointini cagirmali')
assert(!bar.includes('POST') && !bar.includes('method:'), 'bar yalniz GET yapmali')

// Dashboard: single-level consume, no double unwrap
assert(dashboard.includes('api<Readiness>'), 'dashboard tek-seviye cozum kullanmali')
assert(!dashboard.includes('{ data: Readiness }'), 'dashboard cift data cozumu yapmamali')
assert(dashboard.includes('/readiness'), 'dashboard readiness endpointini cagirmali')
assert(!dashboard.includes('POST') && !dashboard.includes('method:'), 'dashboard yalniz GET yapmali')

// Readiness route envelope: { data: { eventId, title, status, gates, counts } }
assert(readiness.includes('export async function GET'), 'readiness GET olmali')
assert(readiness.includes('can.readEvents'), 'readiness read gate olmali')
assert(readiness.includes('assertEventReadable(event'), 'readiness scope dogrulamasi olmali')
for (const gate of ['setup:', 'formBinding:', 'registration:', 'order:', 'ticket:', 'floor:', 'program:', 'hold:']) {
  assert(readiness.includes(gate), `readiness kapisi olmali: ${gate}`)
}

// Occurrence route: GET list + POST create with venue/hall + date guard
assert(occurrences.includes('export async function GET'), 'occurrence GET olmali')
assert(occurrences.includes('export async function POST'), 'occurrence POST olmali')
assert(occurrences.includes('can.writeEvents'), 'occurrence write gate olmali')
assert(occurrences.includes('venue') && occurrences.includes('hall'), 'occurrence venue/hall tasimali')
assert(occurrences.includes('startsAt must be before endsAt'), 'tarih guard olmali')
assert(occurrences.includes("orderBy: { startsAt: 'asc' }"), 'occurrence zaman sirasi olmali')

console.log('ef-event-setup-contract: PASS')
