import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { containsForbiddenKeys, sanitizePublicForm } from '../src/lib/public-dto.ts'

const form = {
  id: 'internal-form',
  formId: 'internal-form',
  workspaceId: 'private-workspace',
  ownerId: 'private-owner',
  title: 'Public kayıt',
  description: 'Public açıklama',
  slug: 'public-kayit',
  status: 'published',
  settingsJson: JSON.stringify({
    successMessage: 'Alındı',
    submitButtonText: 'Gönder',
    secretDoNotLeak: 'private-setting',
  }),
  fields: [{
    id: 'internal-field',
    fieldKey: 'email',
    type: 'email',
    label: 'E-posta',
    required: true,
    configJson: JSON.stringify({ maxLength: 120 }),
  }],
  themes: [{ tokensJson: JSON.stringify({ primary: '#10b981' }), font: 'Inter', radius: 0.5 }],
  appearance: null,
  paymentConfig: {
    enabled: true,
    provider: 'iyzico',
    merchantId: 'private-merchant',
    credentials: 'private-credentials',
    pricingPolicyJson: JSON.stringify({ type: 'fixed', amount: '100.00', currency: 'TRY' }),
  },
}

const publicForm = sanitizePublicForm(form)
const serialized = JSON.stringify(publicForm)

assert.equal(publicForm.slug, 'public-kayit')
assert.equal(publicForm.payment.provider, 'iyzico')
assert.deepEqual(publicForm.payment.pricingPolicy, { type: 'fixed', amount: '100.00', currency: 'TRY' })
assert.equal(containsForbiddenKeys(publicForm).length, 0)
for (const forbiddenValue of ['private-workspace', 'private-owner', 'private-setting', 'private-merchant', 'private-credentials']) {
  assert(!serialized.includes(forbiddenValue), `public snapshot must not contain ${forbiddenValue}`)
}
assert(!('merchantId' in publicForm.payment), 'merchant binding must stay server-side')
assert(!('credentials' in publicForm.payment), 'provider credentials must stay server-side')

const route = readFileSync('src/app/api/public/forms/[slug]/route.ts', 'utf8')
assert.match(route, /status !== 'published'/, 'public route must reject non-published forms')
assert.match(route, /publishedVersionId/, 'public route must use the published version')
assert.match(route, /containsForbiddenKeys\(snapshot\)/, 'public route must fail closed on forbidden snapshot keys')

console.log('form-ux-public-boundary-release.test: PASS')
