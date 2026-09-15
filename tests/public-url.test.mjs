import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const api = readFileSync('src/app/api/public/forms/[slug]/route.ts','utf8')
const page = readFileSync('src/app/forms/[slug]/page.tsx','utf8')
assert(api.includes('publishedVersionId'), 'api must use publishedVersionId snapshot')
assert(api.includes('status !== \'published\'') || api.includes('status !== "published"'), 'must check published status')
assert(page.includes('publishedVersionId'), 'page must use snapshot')
assert(!api.includes('next/font/google'), 'no google font in public (already fixed)')
assert(page.includes('Form bulunamadı') && page.includes('Form yayında değil'), 'must have 404/403 handling')
assert(api.includes('containsForbiddenKeys(snapshot)'), 'public GET must fail closed for forbidden snapshot keys')

console.log('public-url.test: PASS (AC-PUBLIC-01)')
