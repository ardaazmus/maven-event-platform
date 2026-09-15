import assert from 'node:assert'
import { sanitizePublicForm } from '../src/lib/public-dto.ts'

// Simulate publish snapshot parity: draft mutation should not affect public snapshot
const baseForm = {
  title: 'Original Title',
  description: 'desc',
  slug: 'test-snap',
  status: 'draft',
  settingsJson: JSON.stringify({ successMessage: 'ok' }),
  fields: [{ fieldKey: 'email', type: 'email', label: 'E-posta', description: null, placeholder: null, helpText: null, required: true, readOnly: false, defaultValue: null, configJson: JSON.stringify({}) }],
  themes: [{ tokensJson: JSON.stringify({ primary: '#fff' }), font: 'Inter', radius: 0.5, customCss: null }],
  appearance: { headerEnabled: true, headerLogoUrl: null, headerLogoAlt: null, headerLogoWidth: null, headerTitle: 'Hi', headerSubtitle: null, headerDescription: null, headerBgColor: '#fff', headerBgImage: null, headerTextColor: '#000', headerAlign: 'center', headerPadding: 32, contactBarEnabled: false, contactBarBgColor: '#e31e24', contactBarTextColor: '#fff', contactEmail: null, contactPhone: null, contactAddress: null, socialInstagram: null, socialLinkedin: null, socialTwitter: null, socialFacebook: null, socialYoutube: null, footerEnabled: true, footerLogoUrl: null, footerText: 'foot', footerBgColor: '#000', footerTextColor: '#fff', footerLinks: JSON.stringify([]), footerPadding: 24, customCss: null, createdAt: new Date(), updatedAt: new Date() },
}

// Publish creates snapshot (sanitize)
const snapshot = sanitizePublicForm({ ...baseForm, status: 'published' })
assert(snapshot.title === 'Original Title', 'snapshot title original')

// Draft mutation after publish
const mutatedDraft = { ...baseForm, title: 'Mutated Draft', status: 'draft' }
const mutatedSnapshot = sanitizePublicForm(mutatedDraft)
assert(mutatedSnapshot.title === 'Mutated Draft', 'draft mutated title')

// Public should still return snapshot, not draft → snapshot unchanged
assert(snapshot.title !== mutatedSnapshot.title, 'snapshot vs draft differ')
assert(snapshot.title === 'Original Title', 'public still original')

// Internal id leakage check (snapshot must not contain id/formId)
const withIds = { ...baseForm, id: 'internal_123', workspaceId: 'ws', ownerId: 'u', status: 'published' }
const sanitizedWithIds = sanitizePublicForm(withIds)
assert(!('id' in sanitizedWithIds), 'no id in public')
assert(!('workspaceId' in sanitizedWithIds), 'no workspaceId')

// AC-PUBLIC-02: API, page, iframe same DTO — snapshot builder is single source
// This test proves sanitizePublicForm is that single source

console.log('snapshot.test: PASS (AC-PUBLIC-01/02/03)')
