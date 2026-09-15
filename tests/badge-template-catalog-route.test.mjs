import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const source = readFileSync(new URL('../src/app/api/forms/[id]/badges/templates/catalog/route.ts', import.meta.url), 'utf8')
assert.match(source, /getSessionFromCookie/)
assert.match(source, /can\.readSubmissions/)
assert.match(source, /workspaceId: ctx\.workspace\.id/)
assert.match(source, /listBadgeTemplates/)
assert.doesNotMatch(source, /public|downloadUrl/)
console.log('badge-template-catalog-route: all assertions passed')
