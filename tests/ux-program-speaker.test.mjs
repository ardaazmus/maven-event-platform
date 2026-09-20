import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/events/[id]/program/speakers/route.ts', 'utf8')

// POST var; diger mutation'lar yok
assert(route.includes('export async function POST'), 'POST handler olmali')
assert(!route.includes('export async function PUT'), 'PUT olmamali')
assert(!route.includes('export async function DELETE'), 'DELETE olmamali')
assert(!route.includes('export async function PATCH'), 'PATCH olmamali')

// Yazim kapilari: session + writeEvents + event scope
assert(route.includes('can.writeEvents'), 'yazim gate tasimali')
assert(route.includes('assertEventReadable'), 'event scope dogrulanmali')
assert(route.includes('ctx.workspace.id'), 'tenant scope tasimali')

// Zod dogrulama: ad zorunlu, unvan opsiyonel
assert(route.includes('createSpeakerSchema') || route.includes('z.object'), 'zod sema olmali')
assert(route.includes('fullName'), 'ad alani olmali')

// Olusturma + audit + 201
assert(route.includes('db.speaker.create'), 'konusmaci olusturmali')
assert(route.includes('db.auditLog.create'), 'audit yazmali')
assert(route.includes('201'), '201 donmeli')

console.log('ux-program-speaker.test: PASS (konusmaci olusturma kilitli)')
