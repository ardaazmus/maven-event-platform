import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const reports = readFileSync('src/components/mavenforms/views/reports-view.tsx', 'utf8')

assert.match(reports, /<Button[^>]*disabled[^>]*aria-label="Rapor dışa aktarma \(yakında\)"[\s\S]*Export \(yakında\)/, 'unwired report export must be explicitly deferred')
assert.match(reports, /<Button[^>]*disabled[^>]*aria-label="Rapor paylaşımı \(yakında\)"[\s\S]*Paylaş \(yakında\)/, 'unwired report share must be explicitly deferred')

console.log('form-ux-reports-actions.test: PASS')
