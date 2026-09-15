import assert from 'node:assert/strict'
import fs from 'node:fs'

const guide = fs.readFileSync('docs/runbooks/r10-payment-invoice-hold-and-mail-separation.md', 'utf8')
const plan = fs.readFileSync('docs/superpowers/plans/2026-09-02-mavenforms-e-belge-15-dakikalik-uygulama-paketleri.md', 'utf8')
const mailPlan = fs.readFileSync('docs/superpowers/plans/2026-09-02-mavenforms-toplu-e-posta-teslim-edilebilirlik-ve-mail-platformlari.md', 'utf8')

for (const value of ['SUSPENDED_BY_R10', 'notification', 'transactional', 'senderProfileId', 'document_ready', 'manual_accounting', 'parasut_v4']) {
  assert.ok(guide.includes(value), `R-10B guide must define ${value}`)
}
assert.match(guide, /tek bir mail provider hesabı kullanılabilir/i)
assert.match(guide, /public.*invoice sender|invoice sender.*public/i)
assert.match(plan, /SUSPENDED_BY_R10/)
assert.match(plan, /Form kayıt bildirimleri ile fatura teslimat e-postaları/i)
assert.match(mailPlan, /ayrı sender profile/i)

console.log('r10-payment-invoice-hold-mail-separation.test: PASS (R-10B)')
