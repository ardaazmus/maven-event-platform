import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const source = readFileSync('src/app/api/public/forms/[slug]/submissions/route.ts', 'utf8')
assert(source.includes("sf.type === 'email'"), 'public submission must identify an email field for delivery')
assert(source.includes('buildSubmissionEmailIntents'), 'submission route must resolve configured notification intents')
assert(source.includes('emailIntents'), 'outbox enqueue must receive resolved email intents')
assert(source.includes('recipientEmail'), 'outbox payload must carry an explicit recipient contract')
assert(source.includes('emailMessageClass: \'notification\''), 'form notification outbox class must be explicit')
assert(!source.includes('payload: { formId: formMeta.id, submissionId: sub.id, recipientEmail }'), 'legacy submitter-as-admin recipient shortcut must be removed')

console.log('public-submission-outbox-recipient.test: PASS (MAIL-14C)')
