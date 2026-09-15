import assert from 'node:assert/strict'
import { createBadgeHandoffDescriptor } from '../src/lib/badge-handoff-contract.ts'

const base = {
  authenticated: true,
  userId: 'user-1',
  canReadBadge: true,
  workspaceId: 'workspace-1',
  formId: 'form-1',
  jobId: 'job-1',
  preflightStatus: 'PASS',
  artifactWorkspaceId: 'workspace-1',
  artifactFormId: 'form-1',
  artifactFiles: { ZIP: 'badge-export-job-1.zip', COMBINED_PDF: 'combined-front.pdf', MANIFEST: 'manifest.json' },
  nowMs: 1_000,
  ttlSeconds: 60,
}

assert.deepEqual(createBadgeHandoffDescriptor(base), {
  ok: true,
  descriptor: {
    destination: 'LOCAL_DOWNLOAD',
    requiresAuthentication: true,
    workspaceId: 'workspace-1',
    formId: 'form-1',
    jobId: 'job-1',
    availableFormats: ['ZIP', 'COMBINED_PDF', 'MANIFEST'],
    expiresAtMs: 61_000,
  },
})
assert.deepEqual(createBadgeHandoffDescriptor({ ...base, preflightStatus: 'PRINT_PROOF_REQUIRED' }), { ok: false, code: 'PREFLIGHT_NOT_READY' })
assert.deepEqual(createBadgeHandoffDescriptor({ ...base, authenticated: false }), { ok: false, code: 'AUTH_REQUIRED' })
assert.deepEqual(createBadgeHandoffDescriptor({ ...base, canReadBadge: false }), { ok: false, code: 'BADGE_READ_FORBIDDEN' })
assert.deepEqual(createBadgeHandoffDescriptor({ ...base, artifactFormId: 'form-2' }), { ok: false, code: 'SCOPE_MISMATCH' })
assert.deepEqual(createBadgeHandoffDescriptor({ ...base, artifactFiles: { ZIP: 'unsafe/name.zip' } }), { ok: false, code: 'FORMAT_FILE_INVALID' })
assert.deepEqual(createBadgeHandoffDescriptor({ ...base, artifactFiles: {} }), { ok: false, code: 'NO_EXPORT_FORMAT' })
assert.deepEqual(createBadgeHandoffDescriptor({ ...base, ttlSeconds: 901 }), { ok: false, code: 'TTL_INVALID' })

console.log('badge-handoff-contract: all assertions passed')
