import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/views/appearance-panel.tsx','utf8')
const sourceField = readFileSync('src/components/mavenforms/media-source-field.tsx','utf8')
assert(src.includes('MediaSourceField'), 'appearance media controls must use the single-source field')
assert(sourceField.includes('<MediaPicker'), 'single-source field must use the shared media picker')
assert(src.includes('headerLogoUrl') && src.includes('/api/media/'), 'headerLogo must use private media URL')
assert(src.includes('headerBgImage') && src.includes('/api/media/'), 'headerBg must use media')
assert(src.includes('footerLogoUrl') && src.includes('/api/media/'), 'footerLogo must use media')
assert(src.includes('headerLogoMediaId') && src.includes('headerBgMediaId') && src.includes('footerLogoMediaId'), 'local media IDs must be separate from external URLs')
assert(sourceField.includes('Harici URL') && sourceField.includes('externalUrl'), 'external URL must be an explicit secondary source')
assert(src.includes('formId={formId}'), 'must pass formId for scope')
assert(src.includes('formSlug') && src.includes('encodeURIComponent(formSlug)'), 'preview must use the public slug, not the internal form id')
assert(sourceField.includes('aria-pressed') && sourceField.includes('Medya klasörü'), 'active source must be explicit and selectable')

console.log('appearance-picker.test: PASS (AC-MEDIA-APPEARANCE-01)')
