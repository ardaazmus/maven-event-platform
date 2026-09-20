import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/app/api/forms/[id]/badges/templates/route.ts', import.meta.url), 'utf8')
assert.match(source, /getSessionFromCookie/)
assert.match(source, /can\.writeForms/)
assert.match(source, /workspaceId: ctx\.workspace\.id/)
assert.match(source, /PDFDocument\.load/)
assert.match(source, /validateBadgeTemplateUpload/)
assert.match(source, /storeBadgeTemplate/)
assert.match(source, /visibility: 'private'/)
assert.match(source, /sharp/)
assert.match(source, /\.metadata\(\)/)
assert.match(source, /RASTER_MIMES/)
assert.match(source, /FORMAT_MISMATCH/)
assert.match(source, /format: stored\.manifest\.format/)
assert.doesNotMatch(source, /publicUrl|NextResponse\.redirect/i)

console.log('badge-template-upload-route: all assertions passed')
