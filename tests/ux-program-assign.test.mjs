import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/events/[id]/program/sessions/[sessionId]/speakers/route.ts', 'utf8')

// POST var; diger mutation'lar yok
assert(route.includes('export async function POST'), 'POST handler olmali')
assert(!route.includes('export async function PUT'), 'PUT olmamali')
assert(!route.includes('export async function DELETE'), 'DELETE olmamali')
assert(!route.includes('export async function PATCH'), 'PATCH olmamali')

// Yazim kapilari: session + writeEvents + scope
assert(route.includes('can.writeEvents'), 'yazim gate tasimali')
assert(route.includes('assertEventReadable'), 'event scope dogrulanmali')
assert(route.includes('ctx.workspace.id'), 'tenant scope tasimali')

// Oturum + konusmacı baglam dogrulamasi
assert(route.includes('programSession'), 'oturum aramali')
assert(route.includes('speaker'), 'konusmaci aramali')
assert(route.includes('z.object') && route.includes('speakerId'), 'zod speakerId dogrulamali')

// Idempotent bag + audit
assert(route.includes('sessionSpeaker'), 'bag kaydi yazmali')
assert(route.includes('existing'), 'tekrar atama idempotent donmeli')
assert(route.includes('db.auditLog.create'), 'audit yazmali')
assert(route.includes('201'), '201 donmeli')

console.log('ux-program-assign.test: PASS (konusmaci atama kilitli)')
