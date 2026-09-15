import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync('src/components/mavenforms/views/users-view.tsx', 'utf8')

assert.match(source, /örnek veridir/, 'fixture data must be disclosed in the users screen')
assert.match(source, /roleConfig/, 'role matrix must remain available')
assert.match(source, /<details className="rounded-lg border border-border bg-background">/, 'role matrix must be a collapsed secondary reference')
assert.match(source, /Rol izinlerini incele/, 'role matrix must have an explicit disclosure label')
assert.match(source, /disabled\s+aria-label="Kullanıcı daveti \(yakında\)"/, 'unwired invite action must be disabled and labeled')
assert.match(source, /Kullanıcı Davet Et \(yakında\)/, 'unwired invite action must not look ready')
assert.match(source, /aria-label=\{`\$\{u\.name\} işlemleri \(yakında\)`\}/, 'unwired per-user actions must stay explicit')

console.log('FORM-UX-50 users fixture checks passed')
