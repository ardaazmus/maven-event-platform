import assert from 'node:assert'
import { authorizePublishedPaymentContext } from '../src/lib/payment-published-context.ts'

const base = {
  requestedFormId: 'form_123',
  requestedPublishedVersionId: 'version_123',
  form: { id: 'form_123', status: 'published', publishedVersionId: 'version_123' },
  version: { id: 'version_123', formId: 'form_123', status: 'published' },
}

assert.deepEqual(authorizePublishedPaymentContext(base), { ok: true })
assert.deepEqual(authorizePublishedPaymentContext({
  ...base,
  form: { ...base.form, status: 'draft' },
}), { ok: false, reason: 'form_not_published' })
assert.deepEqual(authorizePublishedPaymentContext({
  ...base,
  requestedPublishedVersionId: 'version_other',
}), { ok: false, reason: 'published_version_mismatch' })
assert.deepEqual(authorizePublishedPaymentContext({
  ...base,
  version: { ...base.version, formId: 'form_other' },
}), { ok: false, reason: 'version_form_mismatch' })
assert.deepEqual(authorizePublishedPaymentContext({
  ...base,
  version: { ...base.version, status: 'archived' },
}), { ok: false, reason: 'version_not_published' })

console.log('payment-published-context.test: PASS (PAY-06C)')
