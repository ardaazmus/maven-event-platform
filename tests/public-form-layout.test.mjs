import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const dto = readFileSync('src/lib/public-dto.ts', 'utf8')
const renderer = readFileSync('src/components/mavenforms/public-form-renderer.tsx', 'utf8')
const publicPage = readFileSync('src/app/forms/[slug]/page.tsx', 'utf8')
const embedRoute = readFileSync('src/app/api/forms/[id]/embed-script/route.ts', 'utf8')
const wordpressPanel = readFileSync('src/components/mavenforms/views/wordpress-embed-panel.tsx', 'utf8')

assert(dto.includes('sanitizePublicFieldConfig') && dto.includes('createPublicMediaToken(decoration.mediaAssetId, slug)'), 'public decoration media must become a signed URL')
assert(dto.includes('const { mediaAssetId: _mediaAssetId'), 'public field config must strip internal media ids')
assert(renderer.includes('grid-cols-1') && renderer.includes('md:grid-cols-6') && renderer.includes('lg:grid-cols-12'), 'public renderer must share responsive grid breakpoints')
assert(renderer.includes('normalizeFieldLayout(field.config?.layout)'), 'public renderer must consume normalized field layout')
assert(renderer.includes('--mf-col-start') && renderer.includes('--mf-mobile-col-start'), 'public renderer must preserve explicit new-row layout without freeform positioning')
assert(renderer.includes('FieldDecorationView') && renderer.includes('decoration?.position'), 'public renderer must render field decorations')
assert(renderer.includes('col-span-full w-full gap-2'), 'public submit action must occupy the full row')
assert(publicPage.includes('PublicFormRenderer') && publicPage.includes('sanitizePublicForm'), 'preview and published page must use the same sanitized public renderer')
assert(embedRoute.includes("'/forms/' + encodeURIComponent(slug) + '?embed=1'"), 'inline embed must render the public form route')
assert(wordpressPanel.includes('?embed=1') && wordpressPanel.includes('/forms/'), 'WordPress embed must render the same public form route')

console.log('public-form-layout.test: PASS (AC-LAYOUT-07)')
