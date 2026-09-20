import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(p, 'utf8')
const inv = read('docs/workflow/UI-OLU-EYLEM-ENVANTERI.md')

// Envanter karar bölümlerini taşır
for (const h of ['## SIMPLIFIED', '## DEFERRED', '## ACCEPTED']) {
  assert(inv.includes(h), `envanter ${h} içermeli`)
}

// SIMPLIFIED adayları kaynakta gerçekten pasif
const reports = read('src/components/mavenforms/views/reports-view.tsx')
assert(reports.includes('Export (yakında)'), 'reports Export envanterde ve kaynakta')
assert(reports.includes('Paylaş (yakında)'), 'reports Paylaş envanterde ve kaynakta')
const audit = read('src/components/mavenforms/views/audit-view.tsx')
assert(audit.includes('Export (yakında)'), 'audit Export envanterde ve kaynakta')

// DEFERRED adayları dürüst etiketli
const users = read('src/components/mavenforms/views/users-view.tsx')
assert(users.includes('Kullanıcı Davet Et (yakında)'), 'users davet pasifliği korunmalı')
assert(users.includes('örnek veridir'), 'users dürüst banner korunmalı')
const settings = read('src/components/mavenforms/views/settings-view.tsx')
assert(settings.includes('Planı Yükselt (yakında)'), 'plan yükseltme F9 dondurma korunmalı')
assert(settings.includes('Şimdi Yedekle (yakında)'), 'yedekleme pasifliği korunmalı')
const builder = read('src/components/mavenforms/views/form-builder-view.tsx')
assert(builder.includes("aria-label=\"Geri al (yakında)\""), 'undo pasifliği korunmalı')
assert(builder.includes('ComingSoonPanel'), 'sarmalayıcı envanterde')
const invoice = read('src/components/mavenforms/views/invoice-center-view.tsx')
assert(invoice.includes('document-ready ve teslimat fazında bağlanacak'), 'Gönder dürüst başlığı korunmalı')
const wp = read('src/components/mavenforms/views/wordpress-embed-panel.tsx')
assert(wp.includes('Üretim ZIP paketi yayın öncesi hazırlanacak'), 'WP ZIP açıklaması korunmalı')

// ACCEPTED: sahte connected yok
assert(!builder.includes('Stripe connected') && !builder.includes('Mailchimp connected'), 'sahte connected yok')

console.log('ui-dead-actions.test: PASS (envanter kilitli)')
