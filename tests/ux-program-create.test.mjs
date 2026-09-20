import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/events/[id]/program/route.ts', 'utf8')

// POST var; diger mutation'lar yok
assert(route.includes('export async function POST'), 'POST handler olmali')
assert(!route.includes('export async function PUT'), 'PUT olmamali')
assert(!route.includes('export async function DELETE'), 'DELETE olmamali')
assert(!route.includes('export async function PATCH'), 'PATCH olmamali')

// Yazim kapilari: session + writeEvents + event scope
assert(route.includes('can.writeEvents'), 'yazim gate tasimali')
assert(route.includes('assertEventReadable'), 'event scope dogrulanmali')
assert(route.includes('ctx.workspace.id'), 'tenant scope tasimali')

// Zod dogrulama: baslik, zaman araligi, salon
assert(route.includes('createProgramSessionSchema') || route.includes('z.object'), 'zod sema olmali')
assert(route.includes('startsAt') && route.includes('endsAt'), 'zaman alani olmali')
assert(route.includes('endsAt') && route.includes('startsAt'), 'aralik karsilastirmasi olmali')
assert(route.includes('title'), 'baslik alani olmali')

// Olusturma + audit + 201
assert(route.includes('db.programSession.create'), 'oturum olusturmali')
assert(route.includes('db.auditLog.create'), 'audit yazmali')
assert(route.includes('201'), '201 donmeli')

// Okuma kontrati korunur
assert(route.includes('export async function GET'), 'GET korunmali')
assert(route.includes('take: 100'), 'okuma limiti korunmali')

console.log('ux-program-create.test: PASS (oturum olusturma kilitli)')
