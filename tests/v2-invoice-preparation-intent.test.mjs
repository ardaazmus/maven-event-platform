import assert from 'node:assert/strict'
import { buildPaymentInvoicePreparationIntent } from '../src/lib/payment-invoice-preparation-intent.ts'
import { classifyEmailEvent } from '../src/lib/email-policy.ts'

const valid = buildPaymentInvoicePreparationIntent({
  paymentStatus: 'succeeded',
  recipientEmail: 'billing@example.test',
  formTitle: 'Yıllık Teknoloji Zirvesi',
  registrationMethod: 'Standart kayıt',
  feeStage: 'Erken kayıt',
  amountMinor: 12550,
  currency: 'TRY',
  taxRateBps: 2000,
})

assert.deepEqual(valid, {
  ok: true,
  recipientEmail: 'billing@example.test',
  email: {
    eventKind: 'invoice_preparation',
    messageClass: 'transactional',
    subject: 'Faturanız hazırlanıyor',
    textBody: 'Yıllık Teknoloji Zirvesi için ödemeniz alındı. Faturanız hazırlanıyor.',
  },
  invoiceSnapshot: {
    formTitle: 'Yıllık Teknoloji Zirvesi',
    registrationMethod: 'Standart kayıt',
    feeStage: 'Erken kayıt',
    amountMinor: 12550,
    currency: 'TRY',
    taxRateBps: 2000,
  },
})
assert.equal('documentUrl' in valid, false)
assert.equal('attachment' in valid, false)
assert.equal(classifyEmailEvent('invoice_preparation'), 'transactional')

assert.deepEqual(buildPaymentInvoicePreparationIntent({
  paymentStatus: 'processing',
  recipientEmail: 'billing@example.test',
  formTitle: 'Etkinlik',
  amountMinor: 100,
  currency: 'TRY',
}), { ok: false, reason: 'payment_not_succeeded' })

assert.deepEqual(buildPaymentInvoicePreparationIntent({
  paymentStatus: 'succeeded',
  recipientEmail: 'bad-email',
  formTitle: 'Etkinlik',
  amountMinor: 100,
  currency: 'TRY',
}), { ok: false, reason: 'recipient_invalid' })

console.log('v2-invoice-preparation-intent.test: PASS')
