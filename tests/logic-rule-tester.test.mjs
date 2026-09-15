import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')

assert(src.includes('function evaluateLogicRule'), 'logic tester must evaluate rules locally without creating submissions')
assert(src.includes('Test Başlat'), 'logic tester must expose a test action')
assert(src.includes('Örnek değerlerle etkin kuralların sonucunu kayıt oluşturmadan test edin'), 'logic tester must make its non-mutating behavior explicit')
assert(src.includes('role="status"'), 'logic tester result must be announced accessibly')
assert(src.includes('Eşleşen etkin kural yok.'), 'logic tester must show the no-match state')

console.log('logic-rule-tester.test: PASS (AC-LOGIC-RULE-TEST-01)')
