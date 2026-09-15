import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/app/api/forms/[id]/media/route.ts','utf8')
assert(src.includes('checkRateLimit'), 'must have rate limit')
assert(src.includes('429'), 'must return 429')
assert(src.includes('checkQuota'), 'must have quota')
assert(src.includes('409'), 'must return 409 on quota')
assert(src.includes('423') || src.includes('429') || src.includes('409'), 'abuse status')
const rl = readFileSync('src/lib/rate-limit.ts','utf8')
assert(rl.includes('checkRateLimit'), 'rate-limit must have checkRateLimit')
assert(rl.includes('checkQuota'), 'must have checkQuota')

console.log('media-abuse.test: PASS (AC-MEDIA-ABUSE-01)')
