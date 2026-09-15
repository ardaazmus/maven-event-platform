import assert from 'node:assert'
import { sanitizePublicForm, containsForbiddenKeys } from '../src/lib/public-dto.ts'

// Mock Prisma form with forbidden fields that current API leaks
const mockPrismaForm = {
  id: 'form_internal_123',
  workspaceId: 'ws_secret',
  ownerId: 'user_secret',
  createdById: 'user_secret',
  title: 'Test Form',
  description: 'desc',
  slug: 'test-slug',
  status: 'published',
  settingsJson: JSON.stringify({ successMessage: 'ok', submitButtonText: 'Gönder', captcha: true, secretDoNotLeak: 'xxx' }),
  fields: [
    { id: 'field_internal_1', fieldKey: 'email', type: 'email', label: 'E-posta', description: null, placeholder: 'a@b.com', helpText: null, required: true, readOnly: false, defaultValue: null, configJson: JSON.stringify({ maxLength: 100 }) },
  ],
  themes: [{ tokensJson: JSON.stringify({ primary: '#fff' }), font: 'Inter', radius: 0.5, customCss: null }],
  appearance: {
    id: 'appearance_internal',
    formId: 'form_internal_123',
    headerEnabled: true, headerLogoUrl: null, headerLogoAlt: null, headerLogoWidth: null,
    headerTitle: 'Hi', headerSubtitle: null, headerDescription: null, headerBgColor: '#fff', headerBgImage: null, headerTextColor: '#000', headerAlign: 'center', headerPadding: 32,
    contactBarEnabled: false, contactBarBgColor: '#e31e24', contactBarTextColor: '#fff', contactEmail: null, contactPhone: null, contactAddress: null,
    socialInstagram: null, socialLinkedin: null, socialTwitter: null, socialFacebook: null, socialYoutube: null,
    footerEnabled: true, footerLogoUrl: null, footerText: 'foot', footerBgColor: '#000', footerTextColor: '#fff', footerLinks: JSON.stringify([]), footerPadding: 24, customCss: null,
    createdAt: new Date(), updatedAt: new Date(),
  }
}

const sanitized = sanitizePublicForm(mockPrismaForm)

// Should NOT contain forbidden top-level
assert(!('id' in sanitized), 'sanitized must not contain id')
assert(!('workspaceId' in sanitized), 'must not contain workspaceId')
assert(!('ownerId' in sanitized), 'must not contain ownerId')
assert(sanitized.slug === 'test-slug', 'slug must remain')
assert(sanitized.fields.length === 1, 'fields preserved')
assert(!('id' in sanitized.fields[0]), 'field must not contain internal id')
assert(sanitized.fields[0].fieldKey === 'email', 'fieldKey preserved')
assert(sanitized.appearance !== null, 'appearance sanitized')
assert(!('id' in sanitized.appearance), 'appearance must not contain id')
assert(!('formId' in sanitized.appearance), 'appearance must not contain formId')
assert(!('createdAt' in sanitized.appearance), 'appearance must not contain createdAt')
assert(!('updatedAt' in sanitized.appearance), 'appearance must not contain updatedAt')

// Scan for forbidden keys should be empty
const forbidden = containsForbiddenKeys(sanitized)
assert(forbidden.length === 0, `forbidden keys found: ${forbidden.join(', ')}`)

// Negative: leaking object should be detected
const leaking = { id: 'x', appearance: { id: 'y', formId: 'z' } }
const leakingFound = containsForbiddenKeys(leaking)
assert(leakingFound.length > 0, 'should detect leaking ids')

// Public POST response must not echo personal data
const submittedValues = { email: 'victim@example.com', name: 'John' }
const postResponse = { data: { id: 'sub_123', successMessage: 'ok' } }
const postJson = JSON.stringify(postResponse)
assert(!postJson.includes('victim@example.com'), 'post response must not echo personal data')

console.log('public-forbidden.test: PASS (4 assertions)')
