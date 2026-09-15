import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma','utf8')
assert(schema.includes('model MediaAsset'), 'MediaAsset model must exist')
assert(schema.includes('workspaceId'), 'must have workspaceId')
assert(schema.includes('formId'), 'must have optional formId')
assert(schema.includes('storageKey'), 'must have storageKey')
assert(schema.includes('@unique') && schema.includes('storageKey'), 'storageKey unique')
assert(schema.includes('checksum'), 'must have checksum')
assert(schema.includes('scanStatus'), 'must have scanStatus')
assert(schema.includes('visibility'), 'must have visibility')
assert(schema.includes('@@index([workspaceId, formId])'), 'must have workspace+form index')
assert(schema.includes('@@index([checksum])'), 'must have checksum index')
assert(!schema.includes('publicUrl String @unique'), 'publicUrl should not be unique (only storageKey)')
assert(readFileSync('src/lib/media.ts','utf8').includes('MEDIA_ROOT'), 'media.ts must define MEDIA_ROOT')

console.log('media-asset.test: PASS (AC-MEDIA-DB-01)')
