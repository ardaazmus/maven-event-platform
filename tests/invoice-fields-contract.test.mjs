import assert from 'node:assert/strict'
import { getInvoiceFormConfig, normalizeInvoiceFormConfig, sanitizePublicInvoiceFormConfig } from '../src/lib/invoice-form-config.ts'
import { sanitizePublicForm } from '../src/lib/public-dto.ts'

assert.deepEqual(normalizeInvoiceFormConfig(undefined), {
  version: 1,
  enabled: false,
  recipientCollection: 'optional',
  consentRequired: false,
})
assert.deepEqual(getInvoiceFormConfig({ invoice: { version: 1, enabled: true, recipientCollection: 'required', consentRequired: true } }), {
  version: 1,
  enabled: true,
  recipientCollection: 'required',
  consentRequired: true,
})
assert.equal(normalizeInvoiceFormConfig({ version: 2, enabled: true }).enabled, false, 'unknown config versions must fail closed')
assert.equal(sanitizePublicInvoiceFormConfig({ version: 1, enabled: true, recipientCollection: 'required', consentRequired: true }).enabled, false, 'sanitizer receives the complete settings object')

const publicForm = sanitizePublicForm({
  slug: 'event-form',
  title: 'Event',
  description: null,
  status: 'published',
  settingsJson: JSON.stringify({ invoice: { version: 1, enabled: true, recipientCollection: 'required', consentRequired: true, provider: 'secret-provider' } }),
  fields: [],
  themes: [],
  appearance: null,
  paymentConfig: null,
})

assert.deepEqual(publicForm.settings.invoice, {
  version: 1,
  enabled: true,
  recipientCollection: 'required',
  consentRequired: true,
})
assert.equal('provider' in publicForm.settings.invoice, false, 'provider details must not enter public form settings')

console.log('invoice-fields-contract.test: PASS (INV/F C-00)')
