import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/builder/canvas.tsx','utf8')
assert(src.includes('MediaPicker'), 'must use MediaPicker for media field')
assert(src.includes("field.type === 'media'"), 'must handle media type')
assert(src.includes('mediaAssetId'), 'must store mediaAssetId in config')
assert(src.includes('private') || src.includes('clean'), 'must mention private/clean')
assert(src.includes('onDragOver') && src.includes('application/x-mavenforms-field'), 'canvas must accept dragged field types')
assert(src.includes('onDropField'), 'canvas drop must create a field')
assert(src.includes('onUpdate(field.id'), 'media selection must persist field config')

const palette = readFileSync('src/components/mavenforms/builder/field-palette.tsx','utf8')
assert(palette.includes('draggable'), 'palette items must be draggable')
assert(palette.includes('dataTransfer.setData'), 'palette must transfer field type')

console.log('builder-media.test: PASS (AC-MEDIA-BUILDER-01)')
