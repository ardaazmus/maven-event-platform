import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/app/api/forms/[id]/publish/route.ts','utf8')

// Must be transactional
assert(src.includes('$transaction'), 'publish must use $transaction (M02.2)')
assert(src.includes('archived'), 'publish must archive previous version')

// Must have 8-step atomic inside transaction
assert(src.includes('formVersion.create'), 'must create version')
assert(src.includes('form.update'), 'must update form')
assert(src.includes('auditLog.create'), 'must create audit')
const txIdx = src.indexOf('$transaction')
assert(txIdx !== -1, 'transaction block found')
const afterTx = src.slice(txIdx)
assert(afterTx.includes('formVersion.create') && afterTx.includes('form.update'), 'create and update inside transaction')

// Check that snapshot uses sanitizePublicForm (allowlist)
assert(src.includes('sanitizePublicForm'), 'must use sanitizePublicForm')
assert(src.includes('containsForbiddenKeys'), 'must use exact forbidden-key inspection')
assert(!src.includes("JSON.stringify(schema).toLowerCase().includes(k.toLowerCase())"), 'must not reject safe tokens by substring')

console.log('publish-transaction.test: PASS (AC-PUBLISH-01/02)')
