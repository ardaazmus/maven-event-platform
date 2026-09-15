import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/app/api/forms/[id]/embed-script/route.ts','utf8')
assert(src.includes('window.__mavenformsEmbedLoaded'), 'must handle duplicate init')
assert(src.includes('data-mavenforms-initialized'), 'must handle duplicate element')
assert(src.includes("event.origin !==") || src.includes('event.origin !=='), 'must check origin')
assert(src.includes('mavenforms') && src.includes('postMessage'), 'must handle postMessage')
assert(src.includes('loading="lazy"') || src.includes("loading"), 'must have loading')
assert(!src.includes("'*'") || src.includes('event.origin'), 'must not use wildcard without origin check')
assert(src.includes("status: 'published'"), 'embed script must not expose drafts')
assert(src.includes('event.source !== iframe.contentWindow'), 'message source must match the form iframe')
assert(src.includes('encodeURIComponent(slug)'), 'embed slug must be encoded')

console.log('inline.test: PASS (AC-PUBLIC-02)')
