import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const settings = readFileSync('src/components/mavenforms/views/settings-view.tsx', 'utf8')
const mediaApi = readFileSync('src/app/api/media/route.ts', 'utf8')
const publicRoute = readFileSync('src/app/api/public/branding/media/[token]/route.ts', 'utf8')
const picker = readFileSync('src/components/mavenforms/media-picker.tsx', 'utf8')
const builder = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')
const login = readFileSync('src/components/mavenforms/views/login-view.tsx', 'utf8')

assert((settings.match(/<MediaPicker/g) || []).length >= 4, 'branding image fields must use the media picker')
assert((settings.match(/scope="global"/g) || []).length >= 4, 'branding media must be global settings media')
assert((settings.match(/formId=\{null\}/g) || []).length >= 4, 'branding picker must not receive a form scope')
assert(settings.includes('logoMediaId') && settings.includes('logoDarkMediaId') && settings.includes('faviconMediaId') && settings.includes('loginHeroMediaId'), 'branding media IDs must be separate from external URLs')
assert(settings.includes('updateBrandingExternalUrl'), 'branding external URLs must be explicit secondary sources')
assert(mediaApi.includes('export async function POST'), 'global settings media must support upload')
assert(mediaApi.includes('can.manageSettings'), 'global settings media upload must require settings capability')
assert(mediaApi.includes("scope') !== 'global"), 'generic media upload must reject non-global scope')
assert(picker.includes("'/api/media?scope=global'"), 'picker must use workspace media endpoint without a form')
assert(picker.includes('allowGlobal = false'), 'form picker must default to form-only media access')
assert(publicRoute.includes('asset.formId !== null'), 'public branding route must reject form-scoped assets')
assert(publicRoute.includes('verifyPublicMediaToken'), 'public branding media must require a signed token')
assert(builder.includes('Form kart görseli (16:9)') && builder.includes('coverMediaId'), 'form card cover must be selectable from form media')
assert(login.includes('branding.loginHeroImage'), 'login hero media must be rendered from public branding data')

console.log('branding-media.test: PASS (AC-BRANDING-MEDIA-01)')
