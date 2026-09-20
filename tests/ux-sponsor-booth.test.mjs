import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/events/[id]/sponsors/[sponsorId]/booths/route.ts', 'utf8')

// POST var; diger mutation'lar yok
assert(route.includes('export async function POST'), 'POST handler olmali')
assert(!route.includes('export async function PUT'), 'PUT olmamali')
assert(!route.includes('export async function DELETE'), 'DELETE olmamali')
assert(!route.includes('export async function PATCH'), 'PATCH olmamali')

// Yazim kapilari: session + writeEvents + baglam
assert(route.includes('can.writeEvents'), 'yazim gate tasimali')
assert(route.includes('assertEventReadable'), 'event scope dogrulanmali')
assert(route.includes('ctx.workspace.id'), 'tenant scope tasimali')
assert(route.includes('db.sponsor.findFirst'), 'sponsor baglami aramali')

// Zod: kod zorunlu; unique idempotent
assert(route.includes('assignBoothSchema') || route.includes('z.object'), 'zod sema olmali')
assert(route.includes('code'), 'kod alani olmali')
assert(route.includes('sponsorId_code'), 'unique idempotent bakmali')
assert(route.includes('existing'), 'tekrar atama idempotent donmeli')

// Olusturma + audit + 201
assert(route.includes('db.sponsorBooth.create'), 'stand olusturmali')
assert(route.includes('db.auditLog.create'), 'audit yazmali')
assert(route.includes('201'), '201 donmeli')

console.log('ux-sponsor-booth.test: PASS (stand atama kilitli)')
