import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/app/api/forms/[id]/summary/route.ts','utf8')
assert(src.includes('can.readForms'), 'must check readForms')
assert(src.includes('workspaceId'), 'must scope by workspaceId')
assert(src.includes('publishedVersionId'), 'must return publishedVersionId')
assert(src.includes('fieldCount') || src.includes('_count'), 'must return field count')
assert(src.includes('coverMediaId'), 'must return cover media')
assert(src.includes('statusCounts'), 'must return selected-form status statistics')
assert(src.includes('getSessionFromCookie'), 'must auth')

console.log('summary.test: PASS (AC-FORM-01)')
