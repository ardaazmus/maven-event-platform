import assert from 'node:assert/strict'
import { handoffSucceededPaymentToInvoice } from '../src/lib/payment-invoice-webhook-handoff.ts'

const order = {
  id: 'po_1',
  workspaceId: 'ws_1',
  formId: 'form_1',
  submissionId: 'sub_1',
  publishedVersionId: 'version_1',
  provider: 'stripe',
  status: 'succeeded',
  amountMinor: 12550,
  currency: 'TRY',
}
const snapshot = {
  title: 'Etkinlik kaydı',
  settings: {
    invoice: {
      version: 1,
      enabled: true,
      recipientCollection: 'required',
      consentRequired: true,
      recipientType: 'company',
      fields: { legalName: 'company_name', countryCode: 'country', taxNumber: 'tax_number', taxOffice: 'tax_office' },
    },
  },
}

const created = []
const tx = {
  formVersion: { findUnique: async () => ({ schemaJson: JSON.stringify(snapshot) }) },
  submission: {
    findUnique: async () => ({ values: [
      { valueJson: JSON.stringify({ value: 'Example Ltd' }), field: { fieldKey: 'company_name' } },
      { valueJson: JSON.stringify({ value: 'TR' }), field: { fieldKey: 'country' } },
      { valueJson: JSON.stringify({ value: '1234567890' }), field: { fieldKey: 'tax_number' } },
      { valueJson: JSON.stringify({ value: 'Kadikoy' }), field: { fieldKey: 'tax_office' } },
    ] }) },
  invoiceRecord: {
    findUnique: async () => null,
    create: async ({ data }) => { created.push({ kind: 'invoice', data }); return { id: 'invoice_1', state: data.state } },
  },
  invoiceRecipientSnapshot: { findUnique: async () => null, create: async ({ data }) => { created.push({ kind: 'recipient', data }); return { id: 'recipient_1' } } },
  invoiceLineSnapshot: { createMany: async ({ data }) => { created.push({ kind: 'lines', data }); return { count: data.length } } },
}

const result = await handoffSucceededPaymentToInvoice(tx, order, { MAVENFORMS_INVOICE_PII_KEY: 'a'.repeat(64), MAVENFORMS_INVOICE_PII_KEY_ID: 'invoice-v1' })
assert.deepEqual(result, { ok: true, status: 'persisted', invoiceRecordId: 'invoice_1' })
assert.equal(created.find(item => item.kind === 'recipient').data.legalNameEncrypted.includes('Example Ltd'), false)
assert.equal(created.find(item => item.kind === 'invoice').data.amountMinor, 12550)

const review = await handoffSucceededPaymentToInvoice({
  ...tx,
  formVersion: { findUnique: async () => ({ schemaJson: JSON.stringify({ ...snapshot, settings: { invoice: { version: 1, enabled: true } } }) }) },
  invoiceRecord: { ...tx.invoiceRecord, findUnique: async () => null },
}, order, { MAVENFORMS_INVOICE_PII_KEY: 'a'.repeat(64), MAVENFORMS_INVOICE_PII_KEY_ID: 'invoice-v1' })
assert.deepEqual(review, { ok: true, status: 'review_required', invoiceRecordId: 'invoice_1' })

console.log('payment-invoice-webhook-handoff.test: PASS (INV/F C-02)')
