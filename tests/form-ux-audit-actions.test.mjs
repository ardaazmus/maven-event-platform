import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const audit = readFileSync('src/components/mavenforms/views/audit-view.tsx', 'utf8')

assert.match(audit, /<Button[^>]*disabled[^>]*aria-label="Denetim kayıtlarını dışa aktarma \(yakında\)"[\s\S]*Export \(yakında\)/, 'unwired audit export must be explicitly deferred')
assert.match(audit, /title="Denetim kayıtlarını dışa aktarma \(yakında\)"/, 'deferred audit export needs a visible explanation')
assert.match(audit, /setSearch\(e\.target\.value\)/, 'audit search must remain wired')
assert.match(audit, /setActionFilter/, 'audit action filter must remain wired')

console.log('form-ux-audit-actions.test: PASS')
