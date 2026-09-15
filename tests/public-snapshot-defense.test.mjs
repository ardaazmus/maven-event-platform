import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/public/forms/[slug]/route.ts', 'utf8')

assert(route.includes("import { containsForbiddenKeys } from '@/lib/public-dto'"), 'public route must use the shared forbidden-key scanner')
assert(route.includes('containsForbiddenKeys(snapshot)'), 'public route must reject forbidden snapshot keys at read time')
assert(route.includes('forbidden.length'), 'public route must fail closed when a snapshot contains forbidden keys')
assert(route.includes('publishedVersionId'), 'public route must remain pinned to the published version')

console.log('public-snapshot-defense.test: PASS (PUBLIC-DEFENSE-01)')
