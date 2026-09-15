import assert from 'node:assert/strict'
import { buildBadgePreflightReport } from '../src/lib/badge-preflight-contract.ts'

const passingChecks = [
  { code: 'DIMENSION_VALID', outcome: 'PASS' },
  { code: 'QR_VECTOR', outcome: 'PASS' },
]

const proofRequired = buildBadgePreflightReport({ checks: passingChecks, proofProvided: false })
assert.deepEqual(proofRequired, {
  ok: true,
  report: {
    status: 'PRINT_PROOF_REQUIRED',
    proofSheetRequired: true,
    checks: passingChecks,
    blockedCount: 0,
    warningCount: 0,
  },
})

const pass = buildBadgePreflightReport({ checks: passingChecks, proofProvided: true })
assert.equal(pass.report.status, 'PASS')
assert.equal(pass.report.proofSheetRequired, false)

assert.equal(buildBadgePreflightReport({ checks: [{ code: 'FONT_FALLBACK', outcome: 'WARN' }], proofProvided: true }).report.status, 'WARN_REQUIRES_CONFIRMATION')
assert.equal(buildBadgePreflightReport({ checks: [{ code: 'FONT_FALLBACK', outcome: 'WARN' }], proofProvided: true, warningsConfirmed: true }).report.status, 'PASS')
assert.equal(buildBadgePreflightReport({ checks: [{ code: 'ACTIVE_CONTENT', outcome: 'BLOCKED' }], proofProvided: true }).report.status, 'BLOCKED')

assert.deepEqual(buildBadgePreflightReport({ checks: [], proofProvided: true }), { ok: false, code: 'CHECKS_REQUIRED' })
assert.deepEqual(buildBadgePreflightReport({ checks: [{ code: 'bad code', outcome: 'PASS' }], proofProvided: true }), { ok: false, code: 'CHECK_CODE_INVALID' })
assert.deepEqual(buildBadgePreflightReport({ checks: [{ code: 'DIMENSION_VALID', outcome: 'PASS' }, { code: 'DIMENSION_VALID', outcome: 'PASS' }], proofProvided: true }), { ok: false, code: 'CHECK_CODE_INVALID' })

console.log('badge-preflight-contract: all assertions passed')
