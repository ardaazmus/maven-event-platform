import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/media-picker.tsx','utf8')
assert(src.includes('listWorkspaceMedia') || src.includes('/api/forms'), 'must list via API')
assert(src.includes('scope'), 'must have form/global scope')
assert(src.includes('altText') || src.includes('alt'), 'must have altText')
assert(src.includes('type="file"'), 'must have file input')
assert(src.includes('onChange'), 'must have onChange selection')
assert(src.includes('aria-label'), 'must have a11y')
assert(src.includes('Temizle') || src.includes('remove'), 'must have clear/remove')
assert(src.includes('Medyadan seç') && src.includes('Bilgisayardan yükle'), 'must separate library selection from local upload')
assert(src.includes('Medya klasöründe ara'), 'library search must be contextual, not the default field')
assert(src.includes("method: 'PATCH'") && src.includes('Alt metni kaydet'), 'alt text must be saved after an asset is selected')
assert(src.includes("scanStatus === 'clean'") && src.includes("visibility === 'private'"), 'only private clean media can be active')
assert(src.includes('hasPendingSelection'), 'pending selection must be visible without becoming active')
assert(src.includes("disabled={asset.scanStatus !== 'clean'"), 'unclean library assets must not be selectable')

console.log('media-picker.test: PASS (AC-MEDIA-PICKER-01)')
