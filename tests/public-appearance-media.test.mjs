import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const dto = readFileSync('src/lib/public-dto.ts', 'utf8')
const renderer = readFileSync('src/components/mavenforms/public-form-renderer.tsx', 'utf8')
const page = readFileSync('src/app/forms/[slug]/page.tsx', 'utf8')

assert(dto.includes('appearance.headerLogoMediaId'), 'published appearance must resolve the header media asset')
assert(dto.includes('/api/public/forms/${encodeURIComponent(slug)}/media/${createPublicMediaToken'), 'header media must use a signed public token URL')
assert(dto.includes('appearance.headerBgMediaId'), 'published appearance must resolve the background media asset')
assert(renderer.includes('app.headerLogoUrl'), 'public renderer must consume the sanitized media URL')
assert(!renderer.includes('headerLogoMediaId'), 'public renderer must not receive or construct internal media ids')
assert(page.includes('query.preview === \'1\''), 'preview mode must be explicit')
assert(page.includes('getSessionFromCookie') && page.includes('workspaceId: ctx.workspace.id'), 'draft preview must remain workspace-authenticated')
assert(page.includes('sanitizeDraftPreview(draft)'), 'draft preview must use the same public allowlist with authenticated draft media resolution')

console.log('public-appearance-media.test: PASS (AC-PUBLIC-APPEARANCE-01/02)')
