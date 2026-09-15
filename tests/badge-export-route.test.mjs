import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const source = readFileSync(new URL('../src/app/api/forms/[id]/badges/export/route.ts', import.meta.url), 'utf8')
assert.match(source, /can\.readSubmissions/)
assert.match(source, /readBadgeArtifactManifest/)
assert.match(source, /metadata/) 
assert.match(source, /exportBadgeArtifacts/)
assert.match(source, /ARTIFACT_NOT_READY/)
assert.match(source, /Cache-Control.*private, no-store/s)
assert.doesNotMatch(source, /publicUrl|externalSend|payment|invoice|parasut|V4|R-10/i)
console.log('badge-export-route: all assertions passed (READY-only private export)')
