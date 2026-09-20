import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const source = readFileSync(new URL('../src/app/api/forms/[id]/badges/generate/route.ts', import.meta.url), 'utf8')
assert.match(source, /can\.writeForms/)
assert.match(source, /status !== 'published'/)
assert.match(source, /findBadgeTemplate/)
assert.match(source, /createBadgeSubmissionSnapshot/)
assert.match(source, /executeBadgeGeneration/)
assert.match(source, /SECURE_TOKEN/)
assert.match(source, /QUARANTINED/)
assert.match(source, /RENDER_FORMAT_UNSUPPORTED/)
assert.doesNotMatch(source, /email|telefon|payment|invoice|parasut|V4|R-10/i)
console.log('badge-generation-route: all assertions passed (scoped quarantine action)')
