import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')

assert.match(source, /const workspaceGroups = \[/, 'builder must expose grouped workspace navigation')
for (const label of ['Düzenle', 'Yapılandır', 'Paylaş', 'Sonuçlar']) {
  assert.match(source, new RegExp(`label: '${label}'`), `${label} workspace must remain available`)
}
for (const id of ['fields', 'settings', 'appearance', 'submissions', 'logic', 'notifications', 'embed', 'payment', 'integrations', 'reports']) {
  assert.match(source, new RegExp(`id: '${id}'`), `${id} tab must remain available`)
}
assert.match(source, /formDetailTab === 'theme' \? 'appearance'/, 'legacy theme selection must resolve to appearance')
assert.doesNotMatch(source, /id: 'theme', label: 'Tema'/, 'builder must not expose a competing theme tab')
assert.match(source, /workspaceGroups\.map\(\(group\)/, 'primary workspace controls must be rendered')
assert.match(source, /activeWorkspace\.tabs\.map\(\(t\)/, 'active workspace tabs must be rendered')
assert.match(source, /setActiveTab\('preview'\)/, 'preview action must keep its direct route')

console.log('FORM-UX-41 workspace navigation checks passed')
