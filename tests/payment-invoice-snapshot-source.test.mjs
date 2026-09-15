import assert from 'node:assert/strict'
import { buildPaymentInvoiceSnapshotSource } from '../src/lib/payment-invoice-snapshot-source.ts'

const input = {
  order: {
    id: 'po_1',
    workspaceId: 'ws_1',
    provider: 'stripe',
    status: 'succeeded',
    amountMinor: 12550,
    currency: 'TRY',
  },
  formTitle: 'Etkinlik kaydı',
  settings: {
    invoice: {
      version: 1,
      enabled: true,
      recipientCollection: 'required',
      consentRequired: true,
      recipientType: 'company',
      fields: {
        legalName: 'company_name',
        countryCode: 'country',
        email: 'email',
        taxNumber: 'tax_number',
        taxOffice: 'tax_office',
      },
    },
  },
  values: {
    company_name: 'Example Ltd',
    country: 'TR',
    email: 'billing@example.test',
    tax_number: '1234567890',
    tax_office: 'Kadikoy',
  },
  encrypt: value => `sealed:${value.length}`,
}

const result = buildPaymentInvoiceSnapshotSource(input)
assert.equal(result.ok, true)
assert.deepEqual(result.lines, [{
  lineNumber: 1,
  description: 'Etkinlik kaydı',
  quantity: '1',
  unitPriceMinor: 12550,
  lineTotalMinor: 12550,
  currency: 'TRY',
}])
assert.equal(result.recipient.taxNumberEncrypted, 'sealed:10')
assert.equal(JSON.stringify(result).includes('Example Ltd'), false)

assert.deepEqual(buildPaymentInvoiceSnapshotSource({
  ...input,
  settings: { invoice: { version: 1, enabled: true } },
}), { ok: false, reason: 'recipient_not_ready' })

assert.deepEqual(buildPaymentInvoiceSnapshotSource({
  ...input,
  settings: { invoice: { version: 1, enabled: false } },
}), { ok: false, reason: 'invoice_disabled' })

console.log('payment-invoice-snapshot-source.test: PASS (INV/F C-02)')
