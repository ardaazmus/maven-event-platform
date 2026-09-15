import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const renderer = read('src/components/mavenforms/public-form-renderer.tsx')
const embed = read('src/app/api/forms/[id]/embed-script/route.ts')
const page = read('src/app/forms/[slug]/page.tsx')
const publicRoute = read('src/app/api/public/forms/[slug]/route.ts')
const wordpress = read('src/components/mavenforms/views/wordpress-embed-panel.tsx')

assert(page.includes("query.preview === '1'") && page.includes('getSessionFromCookie'), 'draft preview must remain explicitly authenticated')
assert(page.includes('function sanitizeDraftPreview') && page.includes('sanitizePublicForm(form)') && page.includes('sanitizeDraftPreview(draft)'), 'draft preview must use the public allowlist helper')
assert(publicRoute.includes('containsForbiddenKeys') && publicRoute.includes("status !== 'published'"), 'anonymous public route must fail closed and publish-only')
assert(embed.includes("'/forms/' + encodeURIComponent(slug) + '?embed=1'"), 'embed script must target the public form route')
assert(embed.includes("event.data.type === 'submit'"), 'embed script must forward the documented submit event')
assert(renderer.includes("type: 'submit'"), 'public renderer submit event must match the embed contract')
assert(renderer.includes('getParentOrigin') && renderer.includes('window.parent.postMessage'), 'embedded form must use a scoped parent message target')
assert(wordpress.includes('sandbox=') && wordpress.includes('referrerpolicy'), 'WordPress iframe output must keep browser security attributes')
assert(wordpress.includes("form.status === 'published'") && wordpress.includes('embedScriptUrl'), 'WordPress/embed actions must use the published form state and real script URL')

console.log('form-ux-public-embed.test: PASS')
