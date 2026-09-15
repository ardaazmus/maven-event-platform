import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const users = readFileSync('src/components/mavenforms/views/users-view.tsx', 'utf8')

assert.match(users, /disabled[\s\S]*aria-label=\{`\$\{u\.name\} işlemleri \(yakında\)`\}/, 'unwired user actions must be disabled with a user-specific accessible name')
assert.match(users, /title="Kullanıcı işlemleri \(yakında\)"/, 'deferred user actions need a visible explanation')

console.log('form-ux-users-actions.test: PASS')
