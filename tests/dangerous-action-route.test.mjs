import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/workspace/dangerous-actions/route.ts', 'utf8')
const settings = readFileSync('src/components/mavenforms/views/settings-view.tsx', 'utf8')
assert(route.includes('can.manageDangerousActions'), 'dangerous API must enforce centralized permission')
assert(route.includes('SMTP_HOST') && route.includes('SMTP_FROM'), 'dangerous action must require configured admin email delivery')
assert(route.includes('sendAdminVerificationEmail'), 'dangerous action must not claim delivery without a mail transport')
assert(route.includes('güvenlik nedeniyle durduruldu'), 'mail delivery failure must fail closed')
assert(route.includes('consumedAt: null'), 'challenge must be single-use')
assert(route.includes('expiresAt'), 'challenge must expire')
assert(route.includes('DANGEROUS_CODE_MAX_ATTEMPTS'), 'challenge must limit code attempts')
assert(route.includes("tx.workspace.delete"), 'workspace deletion must be server-side and explicit')
assert(!settings.includes('onClick={() =>') || settings.includes('request_code'), 'settings must not keep a one-click dangerous delete action')

console.log('dangerous-action-route.test: PASS (SEC-DANGER-02)')
