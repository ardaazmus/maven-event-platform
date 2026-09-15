import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')

assert(src.includes('FormSettingsPreview'), 'form settings must include a contextual preview')
assert(src.includes('Katılımcının göreceği yapı'), 'preview must explain whose view is shown')
assert(src.includes('16:9 kapak görseli'), 'preview must make the cover ratio visible')
assert(src.includes('önerilen 1600×900 px'), 'preview must show recommended cover dimensions')
assert(src.includes('PNG, JPEG veya WebP · en fazla 5 MB'), 'preview must show supported image formats and limit')
assert(src.includes('Ayar kontrolü'), 'preview must include contextual setting guidance')

console.log('form-settings-preview.test: PASS (AC-FORM-SETTINGS-PREVIEW-01)')
