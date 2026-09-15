import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const renderer = readFileSync('src/components/mavenforms/public-form-renderer.tsx', 'utf8')

assert(renderer.includes("const imageBackedHeader = Boolean(app.headerBgImage) && failedBackgroundUrl !== app.headerBgImage"), 'headers with a background image must use the full-image path')
assert(renderer.includes("onError={() => setFailedBackgroundUrl(app.headerBgImage)}"), 'failed background images must fall back without leaving a broken overlay')
assert(renderer.includes("width: '100%', height: 'auto'"), 'textless background images must preserve their intrinsic aspect ratio')
assert(renderer.includes("alt=\"\"") && renderer.includes('aria-hidden="true"'), 'decorative background images must remain inaccessible to screen readers')

console.log('public-header-background.test: PASS (AC-HEADER-BACKGROUND-01/02)')
