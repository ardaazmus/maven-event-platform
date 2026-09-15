import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const settings = readFileSync('src/components/mavenforms/views/settings-view.tsx', 'utf8')

for (const label of [
  'Parolayı Güncelle (yakında)',
  'Workspace planını yükseltme (yakında)',
  'Passkey kurulumu (yakında)',
  'LDAP bağlantı testi (yakında)',
  'Planı yükseltme (yakında)',
  'Şimdi yedekleme (yakında)',
]) {
  assert(settings.includes(label), `settings must explain deferred action: ${label}`)
}

assert.match(settings, /disabled aria-label=\{`\$\{s\.device\} oturumunu sonlandır \(yakında\)`\}/, 'session controls must be explicitly deferred')
assert.match(settings, /disabled aria-label=\{`\$\{n\.label\} bildirimi \(yakında\)`\}/, 'notification switches must be explicitly deferred')
assert.match(settings, /setEditingTemplate\(t\)/, 'email template editor action must remain wired')

console.log('form-ux-settings-placeholder-actions.test: PASS')
