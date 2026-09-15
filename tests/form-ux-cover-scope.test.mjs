import assert from 'node:assert/strict'
import fs from 'node:fs'

const builder = fs.readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')
const appearance = fs.readFileSync('src/components/mavenforms/views/appearance-panel.tsx', 'utf8')

assert.match(builder, /Form kart görseli \(16:9\)/, 'cover image control must remain available')
assert.match(builder, /Kart ve form listelerinde gösterilir/, 'cover image usage must be explained')
assert.match(builder, /Yayınlanan formun header görseli Görünüm sekmesinden ayrı yönetilir/, 'header image separation must be explained')
assert.match(builder, /coverMediaId/, 'cover media binding must remain intact')
assert.match(appearance, /Arka Plan Resmi — Yükle veya seç/, 'published header background control must remain available')
assert.match(appearance, /headerBgMediaId/, 'header media binding must remain intact')

console.log('form-ux-cover-scope.test: PASS')
