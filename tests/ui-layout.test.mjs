import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (path) => fs.readFileSync(path, 'utf8')

const shell = read('src/components/mavenforms/app-shell.tsx')
const topbar = read('src/components/mavenforms/topbar.tsx')
const settings = read('src/components/mavenforms/views/settings-view.tsx')
const picker = read('src/components/mavenforms/media-picker.tsx')
const nextConfig = read('next.config.ts')

assert.match(shell, /<main className="min-h-0 min-w-0 flex-1 overflow-auto">/, 'main content must be independently scrollable and shrinkable')
assert.match(topbar, /min-w-\[5\.5rem\].*shrink-0/, 'topbar title must keep a readable minimum width')
assert.match(topbar, /whitespace-nowrap/, 'topbar title must not truncate into an ellipsis')
assert.match(topbar, /hidden min-w-0 flex-1 items-center relative max-w-sm lg:flex/, 'topbar search must hide before it crowds the mobile header')
assert.match(topbar, /hidden gap-2 lg:flex/, 'workspace switcher must hide before it crowds the mobile header')
assert.match(settings, /xl:flex-row/, 'settings navigation must become a side rail at the 1280px wide layout')
assert.match(settings, /xl:flex-col/, 'settings side rail must remain vertical at the 1280px wide layout')
assert.match(settings, /min-width: 1280px/, 'settings navigation breakpoint must match the CSS layout contract')
assert.match(settings, /orientation=\{wideSettingsNav \? 'vertical' : 'horizontal'\}/, 'settings keyboard orientation must follow the responsive layout')
assert.match(settings, /flex gap-2 rounded-lg border border-border bg-background\/95 p-2 shadow-sm/, 'save action must stay in document flow instead of covering fields')
assert.match(settings, /onOpenBranding=\{\(\) => setTab\('branding'\)\}/, 'duplicate theme branding action must lead to the canonical branding tab')
assert.match(picker, /htmlFor=\{uploadInputId\}/, 'media picker must expose a styled upload control')
assert.match(picker, /className="sr-only" type="file"/, 'native file input must remain accessible without breaking the layout')
assert.match(picker, /sm:flex-row sm:items-center/, 'media picker controls must stack on narrow screens')
assert.match(nextConfig, /devIndicators: false/, 'framework development overlay must not cover the product UI')

console.log('ui-layout.test: PASS')
