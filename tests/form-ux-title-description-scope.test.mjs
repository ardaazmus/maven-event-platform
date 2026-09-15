import assert from 'node:assert/strict'
import fs from 'node:fs'

const builder = fs.readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')
const appearance = fs.readFileSync('src/components/mavenforms/views/appearance-panel.tsx', 'utf8')

assert.match(builder, /Form adı \(katılımcı görünümü\)/, 'form title must declare participant-facing scope')
assert.match(builder, /Form kartında ve yayınlanan formun ana başlığında görünür/, 'form title usage must be explained')
assert.match(builder, /Açıklama \(katılımcı görünümü\)/, 'form description must declare participant-facing scope')
assert.match(builder, /Form kartında ve yayınlanan formun giriş bölümünde görünür/, 'form description usage must be explained')
assert.match(appearance, /Üst bölüm başlığı/, 'header title must have a distinct scope label')
assert.match(appearance, /Form ayarlarındaki addan bağımsızdır/, 'header title independence must be explained')
assert.match(appearance, /Üst bölüm açıklaması \(HTML destekler\)/, 'header description must have a distinct scope label')
assert.match(appearance, /Form açıklamasından bağımsızdır/, 'header description independence must be explained')
assert.match(builder, /onUpdate\(\{ title: e\.target\.value \}\)/, 'form title update behavior must remain intact')
assert.match(appearance, /onChange=\{\(e\) => update\('headerTitle', e\.target\.value\)\}/, 'header title update behavior must remain intact')

console.log('form-ux-title-description-scope.test: PASS')
