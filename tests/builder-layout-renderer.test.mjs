import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const canvas = readFileSync('src/components/mavenforms/builder/canvas.tsx', 'utf8')

assert(canvas.includes('deviceGridColumns') && canvas.includes("device === 'tablet' ? 'grid-cols-6'"), 'builder preview must render the selected device grid, not only shrink the canvas')
assert(canvas.includes('normalizeFieldLayout(field.config?.layout)'), 'canvas must render normalized field layout')
assert(canvas.includes('--mf-col-span') && canvas.includes('--mf-tablet-col-span') && canvas.includes('--mf-active-col-span'), 'canvas must use bounded responsive spans')
assert(canvas.includes('--mf-active-col-start') && canvas.includes('breakBefore'), 'canvas must support an explicit new-row start without freeform positioning')
assert(canvas.includes('function ResizeHandle') && canvas.includes('setPointerCapture') && canvas.includes('cursor-ew-resize'), 'selected fields must expose a mouse-accessible column resize handle')
assert(canvas.includes('aria-valuemin={1}') && canvas.includes('ArrowRight') && canvas.includes('ArrowLeft'), 'resize handle must remain keyboard accessible')
assert(canvas.includes('min-w-0'), 'field wrappers must allow long content to shrink without overflow')
assert(canvas.includes('fieldHeightClasses[layout.height]'), 'canvas must render safe height tokens')
assert(canvas.includes('col-span-full'), 'canvas utility actions must occupy the full grid row')
assert(!canvas.includes('<ChevronDown className="absolute right-2'), 'native select must not render a duplicate chevron')

const panel = readFileSync('src/components/mavenforms/builder/properties-panel.tsx', 'utf8')
assert(panel.includes('type="range"') && panel.includes('cursor-ew-resize'), 'field width must be interactively adjustable with an accessible range control')
assert(panel.includes('Mobil davranış') && panel.includes('1/1 tam genişlik'), 'mobile layout must have an explicit safe fallback')
assert(panel.includes('Yeni satırda başlat') && panel.includes('aria-label="Alanı yeni satırda başlat"'), 'field layout must expose an explicit new-row control')
assert(panel.includes('getLayoutGuidance') && panel.includes('Responsive yerleşim önerisi') && panel.includes('role="status"'), 'layout editor must provide non-blocking responsive guidance for risky narrow fields')
assert(panel.includes('Tam genişlik'), 'field layout must expose a full-width shortcut')
assert(panel.includes('min-h-0') && panel.includes('ScrollArea className="min-h-0 flex-1"'), 'properties panel must keep long content inside its own scroll area')

console.log('builder-layout-renderer.test: PASS (AC-LAYOUT-03)')
