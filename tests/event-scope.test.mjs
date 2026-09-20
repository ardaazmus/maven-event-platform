import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { hasCapability, checkCapability } from '../src/lib/policy.ts'
import { assertEventReadable } from '../src/lib/event-scope.ts'

// Capability matrix: read for all event roles, write for owner/admin/form_manager
for (const role of ['owner', 'admin', 'form_manager', 'analyst', 'reviewer', 'viewer']) {
  assert(hasCapability(role, 'events.read') === true, `${role} reads events`)
}
for (const role of ['owner', 'admin', 'form_manager']) {
  assert(hasCapability(role, 'events.write') === true, `${role} writes events`)
}
for (const role of ['analyst', 'reviewer', 'viewer']) {
  assert(hasCapability(role, 'events.write') === false, `${role} must not write events`)
}
assert(checkCapability(null, 'events.read').status === 401, 'anon 401')

// Scope helper: same workspace ok, mismatch 404 (no leak), no ctx 401
const ctxA = { user: { id: 'u1', role: 'owner' }, workspace: { id: 'ws-a' } }
assertEventReadable({ workspaceId: 'ws-a' }, ctxA)
assert.throws(() => assertEventReadable({ workspaceId: 'ws-b' }, ctxA), (e) => e.status === 404, 'wrong-org 404')
assert.throws(() => assertEventReadable({ workspaceId: 'ws-a' }, null), (e) => e.status === 401, 'no ctx 401')

// Route contract: workspace scope + capability, no silent fallback
const route = readFileSync('src/app/api/events/route.ts', 'utf8')
assert(route.includes('workspaceId'), 'route scopes by workspaceId')
assert(route.includes('readEvents') || route.includes('events.read'), 'route checks events capability')

console.log('event-scope.test: PASS')
