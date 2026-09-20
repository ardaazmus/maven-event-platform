import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/events/[id]/abstracts/[abstractId]/reviews/route.ts', 'utf8')

// POST var; diger mutation'lar yok
assert(route.includes('export async function POST'), 'POST handler olmali')
assert(!route.includes('export async function PUT'), 'PUT olmamali')
assert(!route.includes('export async function DELETE'), 'DELETE olmamali')
assert(!route.includes('export async function PATCH'), 'PATCH olmamali')

// Yazim kapilari: session + writeEvents + baglam
assert(route.includes('can.writeEvents'), 'yazim gate tasimali')
assert(route.includes('assertEventReadable'), 'event scope dogrulanmali')
assert(route.includes('ctx.workspace.id'), 'tenant scope tasimali')
assert(route.includes('db.abstract.findFirst'), 'bildiri baglami aramali')

// Zod: skor 0-100 + yorum; hakem session'dan
assert(route.includes('createReviewSchema') || route.includes('z.object'), 'zod sema olmali')
assert(route.includes('score'), 'skor alani olmali')
assert(route.includes('min(0)') && route.includes('max(100)'), 'skor siniri olmali')
assert(route.includes('reviewerId: ctx.user.id'), 'hakem sessiondan gelmeli')

// Olusturma + audit + 201
assert(route.includes('db.abstractReview.create'), 'degerlendirme olusturmali')
assert(route.includes('db.auditLog.create'), 'audit yazmali')
assert(route.includes('201'), '201 donmeli')

console.log('ux-abstract-review.test: PASS (degerlendirme kilitli)')
