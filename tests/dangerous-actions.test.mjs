import assert from 'node:assert'
import { confirmationPhrase, generateDangerousActionCode, hashDangerousActionCode, isAccountAdmin, maskEmail, verifyDangerousActionCode } from '../src/lib/dangerous-actions.ts'
import { sendAdminVerificationEmail } from '../src/lib/admin-verification-email.ts'

const env = { MAVENFORMS_DANGEROUS_ACTION_PEPPER: 'test-only-pepper' }
const code = generateDangerousActionCode()
assert(/^\d{6}$/.test(code), 'danger code must be six digits')
const hash = hashDangerousActionCode('challenge-1', code, env.MAVENFORMS_DANGEROUS_ACTION_PEPPER)
assert.equal(verifyDangerousActionCode('challenge-1', code, hash, env.MAVENFORMS_DANGEROUS_ACTION_PEPPER), true)
assert.equal(verifyDangerousActionCode('challenge-1', '000000', hash, env.MAVENFORMS_DANGEROUS_ACTION_PEPPER), false)
assert.equal(verifyDangerousActionCode('challenge-2', code, hash, env.MAVENFORMS_DANGEROUS_ACTION_PEPPER), false)
assert.equal(isAccountAdmin('owner'), true)
assert.equal(isAccountAdmin('admin'), false)
assert.equal(maskEmail('owner@example.com'), 'o****@example.com')
assert.equal(confirmationPhrase('delete_workspace'), 'SİL')
assert.equal(confirmationPhrase('archive_workspace'), 'ARŞİVLE')
await assert.rejects(() => sendAdminVerificationEmail({ recipient: 'owner@example.com', code, actionLabel: 'workspace silme', expiresInMinutes: 10 }), /missing_smtp_host/)

console.log('dangerous-actions.test: PASS (SEC-DANGER-01)')
