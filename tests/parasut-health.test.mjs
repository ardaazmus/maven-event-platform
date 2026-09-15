import assert from 'node:assert/strict'
import { evaluateParasutHealth } from '../src/lib/parasut-health.ts'

assert.deepEqual(evaluateParasutHealth({ workspaceId: 'ws_1', connectionWorkspaceId: 'ws_1', selectedCompanyId: 'company_1', provider: { ok: true, companyId: 'company_1', tokenValid: true } }), {
  status: 'active',
  canUse: true,
  companyId: 'company_1',
})
assert.deepEqual(evaluateParasutHealth({ workspaceId: 'ws_1', connectionWorkspaceId: 'ws_2', selectedCompanyId: 'company_1', provider: { ok: true, companyId: 'company_1', tokenValid: true } }), {
  status: 'scope_mismatch',
  canUse: false,
})
assert.deepEqual(evaluateParasutHealth({ workspaceId: 'ws_1', connectionWorkspaceId: 'ws_1', selectedCompanyId: null, provider: { ok: true, companyId: 'company_1', tokenValid: true } }), {
  status: 'company_selection_required',
  canUse: false,
})
assert.deepEqual(evaluateParasutHealth({ workspaceId: 'ws_1', connectionWorkspaceId: 'ws_1', selectedCompanyId: 'company_1', provider: { ok: true, companyId: 'company_2', tokenValid: true } }), {
  status: 'scope_mismatch',
  canUse: false,
})
assert.deepEqual(evaluateParasutHealth({ workspaceId: 'ws_1', connectionWorkspaceId: 'ws_1', selectedCompanyId: 'company_1', provider: { ok: true, companyId: 'company_1', tokenValid: false } }), {
  status: 'reauthorization_required',
  canUse: false,
})
assert.deepEqual(evaluateParasutHealth({ workspaceId: 'ws_1', connectionWorkspaceId: 'ws_1', selectedCompanyId: 'company_1', provider: { ok: false, kind: 'rate_limited', retryable: true } }), {
  status: 'health_check_retryable',
  canUse: false,
})

console.log('parasut health contract tests: PASS')
