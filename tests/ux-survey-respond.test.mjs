import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/events/[id]/surveys/[surveyId]/responses/route.ts', 'utf8')

// POST var; diger mutation'lar yok
assert(route.includes('export async function POST'), 'POST handler olmali')
assert(!route.includes('export async function PUT'), 'PUT olmamali')
assert(!route.includes('export async function DELETE'), 'DELETE olmamali')
assert(!route.includes('export async function PATCH'), 'PATCH olmamali')

// Yazim kapilari: session + writeEvents + baglam
assert(route.includes('can.writeEvents'), 'yazim gate tasimali')
assert(route.includes('assertEventReadable'), 'event scope dogrulanmali')
assert(route.includes('ctx.workspace.id'), 'tenant scope tasimali')
assert(route.includes('db.survey.findFirst'), 'anket baglami aramali')

// Zod + boyut + published kurali
assert(route.includes('submitResponseSchema') || route.includes('z.object'), 'zod sema olmali')
assert(route.includes('answers'), 'yanit alani olmali')
assert(route.includes('MAX_ANSWERS_BYTES'), 'boyut siniri olmali')
assert(route.includes('413'), '413 donmeli')
assert(route.includes("status !== 'published'"), 'published kurali olmali')
assert(route.includes('409'), '409 donmeli')

// Olusturma + audit + 201
assert(route.includes('db.surveyResponse.create'), 'yanit olusturmali')
assert(route.includes('db.auditLog.create'), 'audit yazmali')
assert(route.includes('201'), '201 donmeli')

console.log('ux-survey-respond.test: PASS (yanit gonderme kilitli)')
