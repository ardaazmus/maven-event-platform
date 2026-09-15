import assert from 'node:assert'
import { hasCapability, checkCapability, can, ROLE_CAPABILITIES } from '../src/lib/policy.ts'

// Fixture: capability matrix per plan
const expectedMatrix = {
  owner: ['forms.read','forms.write','submissions.read','submissions.update','submissions.delete','members.manage','settings.manage','integrations.manage','billing.manage','audit.read','reports.read'],
  admin: ['forms.read','forms.write','submissions.read','submissions.update','submissions.delete','members.manage','settings.manage','integrations.manage','billing.manage','audit.read','reports.read'],
  form_manager: ['forms.read','forms.write','submissions.read','submissions.update','settings.manage','reports.read'],
  analyst: ['forms.read','submissions.read','reports.read','audit.read'],
  reviewer: ['forms.read','submissions.read','submissions.update'],
  viewer: ['forms.read','submissions.read'],
}
for (const [role,caps] of Object.entries(expectedMatrix)) {
  for (const cap of caps) {
    assert(hasCapability(role, cap) === true, `${role} should have ${cap}`)
  }
}
// Deny-by-default: viewer must NOT have forms.write
assert(hasCapability('viewer','forms.write') === false, 'viewer must not have forms.write')
assert(hasCapability('reviewer','forms.write') === false, 'reviewer must not have forms.write')
assert(hasCapability('analyst','submissions.delete') === false, 'analyst must not delete')
assert(hasCapability('viewer','submissions.delete') === false, 'viewer must not delete')
assert(hasCapability('unknown','forms.read') === false, 'unknown role denied')

// Anonymous → 401
assert(checkCapability(null,'forms.read').status === 401, 'anon 401')
assert(checkCapability(undefined,'forms.read').status === 401, 'undef 401')
assert(checkCapability({ user: null, workspace: null },'forms.read').status === 401, 'null user 401')

// Wrong role → 403, no data leak (status 403 not 404, error generic)
const viewerCtx = { user: { id:'u1', email:'v@test.com', name:'V', role:'viewer' }, workspace: { id:'ws1' } }
assert(checkCapability(viewerCtx,'forms.write').status === 403, 'viewer write 403')
assert(checkCapability(viewerCtx,'forms.write').allowed === false, 'viewer write not allowed')
assert(!checkCapability(viewerCtx,'forms.write').error?.includes('ws1'), 'no workspace leak in error')

// Correct role → 200
const ownerCtx = { user: { id:'u1', email:'o@test.com', name:'O', role:'owner' }, workspace: { id:'ws1' } }
assert(checkCapability(ownerCtx,'forms.write').status === 200, 'owner write 200')
assert(checkCapability(ownerCtx,'submissions.delete').allowed === true, 'owner delete allowed')

// Inactive-member simulation: auth returns null → 401 (deny-by-default)
assert(checkCapability(null,'forms.read').status === 401, 'inactive -> null -> 401')

// Wrong-workspace is enforced at route layer (form.workspaceId check), policy only checks capability
// Named helpers
assert(can.readForms(viewerCtx).allowed === true, 'can.readForms')
assert(can.writeForms(viewerCtx).allowed === false, 'can.writeForms deny')
assert(can.deleteSubmissions(ownerCtx).allowed === true, 'owner delete')
assert(can.deleteSubmissions(viewerCtx).allowed === false, 'viewer delete deny')

// Unknown capability denied
assert(checkCapability(ownerCtx,'billing.manage').allowed === true, 'owner billing')
// viewer billing denied
assert(checkCapability(viewerCtx,'billing.manage').allowed === false, 'viewer billing deny')

console.log('policy.test: PASS (matrix + 401/403 + named helpers)')
