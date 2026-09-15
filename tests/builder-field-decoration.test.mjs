import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const panel = readFileSync('src/components/mavenforms/builder/properties-panel.tsx', 'utf8')
const canvas = readFileSync('src/components/mavenforms/builder/canvas.tsx', 'utf8')
const picker = readFileSync('src/components/mavenforms/builder/icon-picker.tsx', 'utf8')

assert(panel.includes('MediaPicker') && panel.includes('formId={formId}'), 'field decorations must use the form-scoped media picker')
assert(panel.includes('<IconPicker') && picker.includes('aria-selected={selected}'), 'built-in icon selection must expose an active state')
assert(panel.includes('position') && panel.includes('top') && panel.includes('left') && panel.includes('right'), 'decoration position controls must exist')
assert(canvas.includes('/api/media/${decoration.mediaAssetId}?formId='), 'builder media decoration must use a form-scoped private URL')
assert(canvas.includes('decoration.position === \'right\'') && canvas.includes('decoration.position === \'top\''), 'canvas must render side and top decoration layouts')

console.log('builder-field-decoration.test: PASS (AC-LAYOUT-06)')
