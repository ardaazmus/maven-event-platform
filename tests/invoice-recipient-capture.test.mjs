import assert from 'node:assert/strict'
import { captureInvoiceRecipient } from '../src/lib/invoice-recipient-capture.ts'

const config = {
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
    billingAddress: 'address',
  },
}

const result = captureInvoiceRecipient({
  config,
  values: {
    company_name: 'Example Ltd',
    country: 'TR',
    email: 'billing@example.test',
    tax_number: '1234567890',
    tax_office: 'Kadikoy',
    address: 'Private address',
  },
  encrypt: value => `sealed:${value.length}`,
})

assert.equal(result.ok, true)
assert.equal(result.validationStatus, 'valid')
assert.equal(result.recipient.legalNameEncrypted, 'sealed:11')
assert.equal(result.recipient.taxNumberEncrypted, 'sealed:10')
assert.equal(result.recipient.emailEncrypted, 'sealed:20')
assert.equal(result.recipient.billingAddressEncrypted, 'sealed:15')
assert.equal(JSON.stringify(result).includes('Example Ltd'), false)

const missingMapping = captureInvoiceRecipient({
  config: { ...config, fields: undefined },
  values: {},
  encrypt: value => `sealed:${value.length}`,
})
assert.deepEqual(missingMapping, { ok: false, reason: 'mapping_missing' })

const invalid = captureInvoiceRecipient({
  config,
  values: {
    company_name: 'Example Ltd',
    country: 'TR',
    email: 'billing@example.test',
    tax_number: 'bad',
    tax_office: 'Kadikoy',
    address: 'Private address',
  },
  encrypt: value => `sealed:${value.length}`,
})
assert.equal(invalid.ok, false)
assert.equal(invalid.reason, 'recipient_invalid')
assert.equal(JSON.stringify(invalid).includes('bad'), false)

console.log('invoice-recipient-capture.test: PASS (INV/F C-02)')
