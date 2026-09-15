import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/app/api/forms/[id]/badges/artifacts/route.ts', import.meta.url), 'utf8')
assert.match(source, /getSessionFromCookie/)
assert.match(source, /can\.readSubmissions/)
assert.match(source, /BADGE_ARTIFACT_ROOT/)
assert.match(source, /readdir/)
assert.match(source, /MAX_ARTIFACTS/)
assert.match(source, /readBadgeArtifactManifest/)
assert.match(source, /state: descriptor\.state/)
assert.match(source, /downloadable: descriptor\.downloadable/)
assert.doesNotMatch(source, /storageKey|sha256|filename: manifest|submissionEmail/i)

console.log('badge-artifact-list-route: all assertions passed (scoped DTO)')
