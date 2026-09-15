import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const builder = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')
const forms = readFileSync('src/components/mavenforms/views/forms-list-view.tsx', 'utf8')
const settings = readFileSync('src/components/mavenforms/views/settings-view.tsx', 'utf8')

assert.match(builder, /id: 'appearance', label: 'Görünüm'/, 'form appearance tab must remain available')
assert.doesNotMatch(builder, /id: 'theme', label: 'Tema'/, 'form theme must not remain as a competing visible tab')
assert.match(builder, /formDetailTab === 'theme' \? 'appearance'/, 'legacy theme state must resolve to the unified appearance workspace')
assert.match(builder, /ThemePanel form=\{form\}/, 'the existing form theme editor must remain in the builder')
assert.match(builder, /Form teması/, 'form theme scope must remain named in the builder')
assert.match(builder, /Uygulama panelinin teması Ayarlar/, 'builder must explain where the application theme is configured')
assert.match(forms, /label: 'Tasarım'/, 'form management menu must group appearance and theme under design')
assert.match(forms, /Görünüm ve tema/, 'form management menu must describe the unified visual scope')
assert.doesNotMatch(forms, /id: 'theme', label: 'Form teması'/, 'form management menu must not expose a duplicate theme action')
assert.match(settings, /label: 'Uygulama teması'/, 'workspace settings must distinguish the application theme')
assert.match(settings, /title="Uygulama teması"/, 'application theme section must expose a clear accessible title')

console.log('FORM-UX-64 settings taxonomy checks passed')
