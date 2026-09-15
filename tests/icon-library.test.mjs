import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const registry = readFileSync('src/lib/icon-registry.ts', 'utf8')
const picker = readFileSync('src/components/mavenforms/builder/icon-picker.tsx', 'utf8')
const properties = readFileSync('src/components/mavenforms/builder/properties-panel.tsx', 'utf8')

assert(registry.includes('iconCatalog'), 'shared icon catalog must exist')
assert((registry.match(/id: '/g) || []).length >= 40, 'catalog must provide a broad icon selection')
assert(registry.includes('getIconComponent'), 'canvas and public renderer must resolve one shared registry')
assert(picker.includes('Icon kütüphanesinde ara'), 'icon picker must be searchable')
assert(picker.includes('aria-selected={selected}'), 'icon picker must expose selection state')
assert(picker.includes('Icon göster') && picker.includes('aria-expanded={false}'), 'icon library must stay collapsed until requested')
assert(picker.includes('Icon gizle') && picker.includes('aria-expanded={true}'), 'icon library must expose a hide action after opening')
assert(properties.includes('<IconPicker'), 'properties panel must use the shared icon picker')
console.log('icon-library.test: PASS (AC-ICON-LIBRARY-01)')
