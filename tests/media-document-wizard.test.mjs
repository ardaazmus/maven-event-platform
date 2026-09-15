import assert from 'node:assert/strict'
import { MEDIA_DOCUMENT_STEPS, mediaDocumentCapability } from '../src/components/mavenforms/media-document-wizard.tsx'
import { readFileSync } from 'node:fs'

assert.deepEqual(MEDIA_DOCUMENT_STEPS.map(step => step.id), ['scope', 'scan', 'preview', 'retention'])
assert.deepEqual(mediaDocumentCapability(), { enabled: false, reason: 'scope_required' })
assert.deepEqual(mediaDocumentCapability({ scopedToOwner: true }), { enabled: false, reason: 'private_visibility_required' })
assert.deepEqual(mediaDocumentCapability({ scopedToOwner: true, visibility: 'private' }), { enabled: false, reason: 'scan_required' })
assert.deepEqual(mediaDocumentCapability({ scopedToOwner: true, visibility: 'private', scanStatus: 'clean', assetState: 'clean', previewAvailable: true, retentionReady: true }), { enabled: false, reason: 'asset_not_ready' })
assert.deepEqual(mediaDocumentCapability({ scopedToOwner: true, visibility: 'private', scanStatus: 'clean', assetState: 'ready', previewAvailable: true, retentionReady: false }), { enabled: false, reason: 'retention_required' })
assert.deepEqual(mediaDocumentCapability({ purpose: 'form_media', scopedToOwner: true, visibility: 'private', scanStatus: 'clean', assetState: 'ready', previewAvailable: true, altTextReviewed: true, retentionReady: true }), { enabled: true, reason: 'ready_for_manual_review' })

const center = readFileSync('src/components/mavenforms/views/invoice-center-view.tsx', 'utf8')
assert(center.includes("import { MediaDocumentWizard }"), 'invoice center must import media document wizard')
assert(center.includes('<MediaDocumentWizard />'), 'invoice center must expose media document wizard')

const source = readFileSync('src/components/mavenforms/media-document-wizard.tsx', 'utf8')
for (const marker of ['private medya/belge alanı', 'karantina', 'önizleme', 'alt metin', 'retention', 'server-owned']) {
  assert(source.includes(marker), `media document wizard missing ${marker}`)
}
assert.equal(source.includes('fetch('), false)
assert.equal(source.includes('db.'), false)
assert.equal(source.includes('credentialsEnvelope'), false)

console.log('media-document-wizard.test: PASS (R10-V4-29)')
