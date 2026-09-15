import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/app/api/forms/[id]/badges/route.ts', import.meta.url), 'utf8')

assert.match(source, /getSessionFromCookie/)
assert.match(source, /can\.readSubmissions/)
assert.match(source, /workspaceId:\s*ctx\.workspace\.id/)
assert.match(source, /deletedAt:\s*null/)
assert.match(source, /status:\s*\{ notIn: \['spam', 'archived'\] \}/)
assert.match(source, /resolveBadgeEntrySurface/)
assert.match(source, /formDetail/)
assert.match(source, /submissionSelection/)
assert.doesNotMatch(source, /email|phone|qrPayload|storageKey|provider|secret|token/i)

console.log('badge-entry-route: all assertions passed')
