import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const view = readFileSync('src/components/mavenforms/views/submissions-view.tsx', 'utf8')
const listView = readFileSync('src/components/mavenforms/views/forms-list-view.tsx', 'utf8')
const policy = readFileSync('src/lib/policy.ts', 'utf8')
const route = readFileSync('src/app/api/forms/[id]/submissions/[subId]/route.ts', 'utf8')

const liveIndex = view.indexOf('Yayınlanan formun kullanıcıların gördüğü canlı hali')
const statsIndex = view.indexOf('aria-label="Form istatistikleri"')
const searchIndex = view.indexOf('aria-label="Yanıtlarda ara"')
const rowsIndex = view.indexOf('<tbody')
assert(liveIndex >= 0 && liveIndex < statsIndex && statsIndex < searchIndex && searchIndex < rowsIndex, 'selected form flow order must be live form, stats, search, responses')
assert(view.includes('sandbox="allow-forms allow-scripts allow-same-origin allow-popups"'), 'live preview must use a constrained iframe sandbox')
assert(view.includes('paymentStatus'), 'responses must expose payment status')
assert(view.includes('paymentUpdating'), 'manual payment actions must prevent duplicate clicks while saving')
assert(listView.includes('FocusedFormWorkspace'), 'forms list must keep the selected form workspace visible')
assert(listView.includes('Form ayarları'), 'selected form must keep settings access visible')
assert(policy.includes("'submissions.payment_update'"), 'payment update must be a separate capability')
assert(route.includes('updateSubmissionPayment'), 'submission route must enforce separate payment capability')
assert(route.includes('paymentStatus'), 'submission route must keep payment status input')

console.log('v1-internal-forms-view.test: PASS (AC-V1-04)')
