import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const guide = readFileSync('docs/runbooks/r10-external-evidence-guide.md', 'utf8')

for (const heading of [
  '## 2. Roller ve kimin ne sağlayacağı',
  '## 3. Kullanıcıdan MavenForms’a verilecek güvenli paket',
  '## 4. Ödeme sağlayıcıları: kurulum ve kanıt sırası',
  '## 5. Manuel fatura ve muhasebe handoff’u',
  '## 6. Paraşüt API v4 ve e-belge adımları',
  '## 7. Belge güvenliği ve document-ready',
  '## 8. Transactional fatura e-postası',
  '## 9. Staging, production ve backup kanıtı',
  '## 10. Kanıt dosyası şablonu',
  '## 11. R-10’u ne açar, ne açmaz?',
]) assert(guide.includes(heading), `guide heading missing: ${heading}`)

for (const forbidden of ['PAN', 'CVV', 'access/refresh token', 'webhook secret', 'raw JSON', 'geçici PDF URL’si']) {
  assert(guide.includes(forbidden), `guide must explicitly forbid ${forbidden}`)
}

assert(guide.includes('EXTERNAL_DEPENDENCY'))
assert(guide.includes('LEGAL_REVIEW_REQUIRED'))
assert(guide.includes('NO-GO'))
assert(guide.includes('document_ready'))
assert(guide.includes('idempotency'))
for (const field of [
  'Dependency-ID:',
  'Evidence-Class:',
  'Evidence-Status:',
  'Expires-At-UTC:',
  'Scope:',
  'Decision:',
]) assert(guide.includes(field), `registry field missing: ${field}`)
for (const status of ['verified', 'unknown', 'unsupported', 'blocked', 'expired']) {
  assert(guide.includes(status), `registry status missing: ${status}`)
}
assert(guide.includes('registry kaydı') && guide.includes('production kararında PASS’a yükseltilemez'))
console.log('PASS R-10 external evidence guide test (role-based, secret-safe, no automatic release)')
