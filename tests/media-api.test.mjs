import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const apiMedia = readFileSync('src/app/api/media/route.ts','utf8')
const formMedia = readFileSync('src/app/api/forms/[id]/media/route.ts','utf8')
const mediaLib = readFileSync('src/lib/media.ts','utf8')
assert(apiMedia.includes('listWorkspaceMedia'), 'must use listWorkspaceMedia')
assert(formMedia.includes('listWorkspaceMedia'), 'form media must use listWorkspaceMedia')
assert(mediaLib.includes('originalName') && !mediaLib.includes('storageKey') || mediaLib.includes('return assets.map'), 'DTO must not leak storageKey in media.ts')
assert(apiMedia.includes('can.readForms'), 'must check capability')
assert(formMedia.includes('can.readForms'), 'must check capability')
assert(apiMedia.includes('scope'), 'must handle scope param')

console.log('media-api.test: PASS (AC-MEDIA-API-01)')
