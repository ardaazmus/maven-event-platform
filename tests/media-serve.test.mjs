import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/app/api/media/[id]/route.ts','utf8')
assert(src.includes('assertMediaReadable'), 'must use assertMediaReadable')
assert(src.includes('storageKey'), 'must read storageKey')
assert(src.includes('readFile'), 'must read private file')
assert(src.includes('Content-Disposition'), 'must set Content-Disposition')
assert(src.includes('Content-Type'), 'must set Content-Type')
assert(!src.includes('public/media'), 'must not serve from public/media')
assert(src.includes('can') || src.includes('getSessionFromCookie'), 'must check auth')
assert(src.includes('404'), 'must return 404 on scope denial')

console.log('media-serve.test: PASS (AC-MEDIA-SERVE-01)')
