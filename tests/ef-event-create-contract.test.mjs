import assert from 'node:assert'
import { readFileSync } from 'node:fs'

// EF-02A: POST /api/events server contract, serverless static assertions.
// Live behavior (anon 401, role gate, validation 400, create 201) is covered by
// tests/event-create.test.mjs against a running server; this file locks the
// source contract so refactors cannot silently drop auth/scope/validation.

const route = readFileSync('src/app/api/events/route.ts', 'utf8')

// Handler shape
assert(route.includes('export async function POST'), 'POST handler olmali')
assert(route.includes('export async function GET'), 'GET handler olmali')

// Auth: session required, anon -> 401 before any capability check or write
assert(route.includes('getSessionFromCookie'), 'session okunmali')
const post = route.slice(route.indexOf('export async function POST'))
assert(post.includes("status: 401"), 'anon 401 donmeli')
assert(post.indexOf('status: 401') < post.indexOf('db.event.create'), 'auth yazmadan once olmali')

// Authorization: capability gate before validation and write
assert(post.includes('can.writeEvents'), 'writeEvents gate olmali')
assert(post.indexOf('can.writeEvents') < post.indexOf('db.event.create'), 'yetki yazmadan once olmali')

// Validation: zod schema with bounds, invalid -> 400
assert(route.includes('createEventSchema'), 'zod sema olmali')
assert(route.includes('title: z.string().min(1).max(200)'), 'title 1..200 olmali')
assert(route.includes("description: z.string().max(2000)"), 'description en fazla 2000 olmali')
assert(post.includes('safeParse'), 'safeParse kullanilmali')
assert(post.includes('status: 400'), 'gecersiz girdi 400 donmeli')
assert(post.indexOf('status: 400') < post.indexOf('db.event.create'), 'validation yazmadan once olmali')

// Scope: tenant + actor binding on create, never from client body
assert(post.includes('workspaceId: ctx.workspace.id'), 'workspace sessiondan alinmali')
assert(post.includes('createdById: ctx.user.id'), 'createdBy sessiondan alinmali')
assert(!post.includes('parsed.data.workspaceId') && !post.includes('body.workspaceId'), 'workspace clienttan gelmemeli')

// Success: 201 with minimal { data: { id, title } }, no row echo
assert(post.includes('status: 201'), 'basari 201 donmeli')
assert(post.includes('data: { id: event.id, title: event.title }'), 'yanit minimal olmali')

// GET list is workspace-scoped and auth-gated too
const get = route.slice(route.indexOf('export async function GET'), route.indexOf('export async function POST'))
assert(get.includes('can.readEvents'), 'GET readEvents gate olmali')
assert(get.includes('where: { workspaceId: ctx.workspace.id }'), 'GET workspace scope olmali')

console.log('ef-event-create-contract: PASS')
