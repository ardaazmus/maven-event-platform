import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const sourceField = readFileSync('src/components/mavenforms/media-source-field.tsx', 'utf8')
const appearance = readFileSync('src/components/mavenforms/views/appearance-panel.tsx', 'utf8')
const builder = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')

assert.match(sourceField, /aria-pressed=\{source === 'library'\}/, 'library source must expose selected state')
assert.match(sourceField, /aria-pressed=\{source === 'external'\}/, 'external source must expose selected state')
assert.match(sourceField, /source === 'library' \? \(/, 'library editor must be conditional')
assert.match(sourceField, /: \(/, 'external editor must be conditional')
assert.match(sourceField, /onExternalUrlChange\(''\)/, 'switching to library must clear the previously active external source')
assert.match(sourceField, /onMediaChange\(null\)/, 'switching to external must clear the previously active media source')
assert(appearance.includes('externalUrl={externalUrlValue(data.headerLogoUrl) || null}'), 'header logo must pass one active external source')
assert(builder.includes('externalUrl={externalUrlValue(form.settings?.coverImageUrl)}'), 'form cover must pass one active external source')
assert(builder.includes('coverImageUrl: id ? null : externalUrlValue(form.settings?.coverImageUrl)'), 'form cover must not persist an internal media URL as an external source')

console.log('form-ux-media-source-mode.test: PASS')
