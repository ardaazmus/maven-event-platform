import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const page = readFileSync('src/app/forms/[slug]/page.tsx', 'utf8')
const publicDto = readFileSync('src/lib/public-dto.ts', 'utf8')
const publicMedia = readFileSync('src/app/api/public/forms/[slug]/media/[token]/route.ts', 'utf8')

assert(page.includes('function sanitizeDraftPreview'), 'preview must have an explicit draft media boundary')
assert(page.includes('/api/media/${encodeURIComponent(assetId)}?formId=${encodeURIComponent(formId)}'), 'draft preview must use form-scoped private media URLs')
assert(page.includes('sanitizeDraftPreview(draft)'), 'authenticated preview must use the draft media boundary')
assert(page.includes('headerLogoMediaId') && page.includes('headerBgMediaId') && page.includes('footerLogoMediaId'), 'appearance media surfaces must be mapped for preview')
assert(page.includes('sourceConfig?.decoration?.source === \'media\''), 'field decoration media must be mapped for preview')
assert(publicDto.includes('createPublicMediaToken'), 'anonymous public snapshot must retain signed media URLs')
assert(publicMedia.includes("scanStatus: 'clean'"), 'anonymous public media must remain clean-only')
console.log('form-ux-preview-media.test: PASS')
