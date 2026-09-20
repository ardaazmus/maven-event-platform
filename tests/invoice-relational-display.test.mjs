import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const view = readFileSync('src/components/mavenforms/views/invoice-center-view.tsx', 'utf8')
const model = readFileSync('src/lib/invoice-center-read-model.ts', 'utf8')

// K-06: odeme/fatura/teslimat ayri etiketli satirlarda (dl/dt/dd)
for (const label of ['Ödeme durumu:', 'Fatura durumu:', 'Teslimat durumu:', 'Belge:']) {
  assert(view.includes(label), `iliskisel satir etiketi olmali: ${label}`)
}
assert(view.includes('<dl') && view.includes('</dl>'), 'durum listesi dl olmali')

// Iade-benzeri satir rozet + tek cumlelik aciklama tasir
assert(view.includes('refundLikeStates.has(row.payment.status)'), 'iade kosulu korunmali')
assert(
  view.includes('iade/itiraz durumu nedeniyle export dışı bırakıldı'),
  'iade aciklamasi tek cumle olmali',
)

// DTO/sozlesme degismedi: ayni endpointler, ayni read-model secimi
for (const url of ['/api/invoices/center', '/api/invoices/export', '/api/invoices/import']) {
  assert(view.includes(url), `endpoint korunmali: ${url}`)
}
assert(model.includes('invoiceCenterSelect'), 'read-model secimi korunmali')
assert(!view.includes('allocation'), 'DTO disi allocation alani eklenmemeli')

// Durust etiket: bitmis-odeme iddiasi yok
assert(!view.includes('ödeme alındı') && !view.includes('Ödeme alındı'), 'bitmis odeme iddiasi yok')

console.log('invoice-relational-display.test: PASS (iliskisel satirlar + iade aciklamasi kilitli)')
