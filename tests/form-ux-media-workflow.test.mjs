import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const picker = readFileSync('src/components/mavenforms/media-picker.tsx', 'utf8')
const appearance = readFileSync('src/components/mavenforms/views/appearance-panel.tsx', 'utf8')
const builder = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')
const sourceField = readFileSync('src/components/mavenforms/media-source-field.tsx', 'utf8')
const properties = readFileSync('src/components/mavenforms/builder/properties-panel.tsx', 'utf8')
const route = readFileSync('src/app/api/forms/[id]/media/route.ts', 'utf8')
const publicDto = readFileSync('src/lib/public-dto.ts', 'utf8')

assert(picker.includes("type=\"file\""), 'media picker must expose a local file input')
assert(picker.includes("Medyadan seç") && picker.includes("Bilgisayardan yükle"), 'picker must expose library and local upload actions')
assert(picker.includes('/api/forms/${formId}/media?scope=${scope}'), 'form uploads/listing must use the form media route')
assert(picker.includes('selectedAsset') && picker.includes('Aktif kaynak'), 'selected media must show the active source and preview state')
assert(picker.includes('Medya klasöründe ara'), 'library search must be contextual to the current media scope')
assert(appearance.includes('<MediaSourceField') && builder.includes('<MediaSourceField') && sourceField.includes('<MediaPicker') && properties.includes('<MediaPicker'), 'all builder appearance media surfaces must use the shared picker')
assert(sourceField.includes("source === 'library'") && sourceField.includes("source === 'external'"), 'media sources must have one active editor at a time')
assert(/if\s*\(\s*scope\s*===\s*'global'\s*\)\s*return/.test(route), 'form media route must reject global scope instead of exposing workspace media')
assert(route.includes('asset.formId !== id'), 'form attach must reject assets owned by another form')
assert(route.includes('width: asset.width') && route.includes('height: asset.height'), 'upload response must expose dimensions for immediate active preview metadata')
assert(publicDto.includes('/api/public/forms/${encodeURIComponent(slug)}/media/${createPublicMediaToken'), 'public media must use a signed public token URL')
assert(!picker.includes('scope=all'), 'picker must not request an unrestricted all-media scope')

console.log('form-ux-media-workflow.test: PASS')
