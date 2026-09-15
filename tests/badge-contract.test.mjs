import assert from 'node:assert/strict'
import {
  BADGE_QR_MODES,
  assertBadgeIdentitySeparation,
  badgeFilenameCollisionKey,
  buildBadgePdfFilename,
  isPublicBadgeQrMode,
  isSecureBadgeQrMode,
  normalizeBadgeFilenameSegment,
} from '../src/lib/badge-contract.ts'

const identity = {
  participantId: 'participant-1',
  submissionId: 'submission-1',
  badgeId: 'badge-1',
  badgeInstanceId: 'badge-instance-1',
  qrTokenId: 'qr-token-1',
  generationJobId: 'job-1',
  outputId: 'output-1',
  outputIdShort: '7K4M2P8Q9X6D',
}

assert.deepEqual(BADGE_QR_MODES, ['NONE', 'PUBLIC_CARD_URL', 'INLINE_VCARD', 'SECURE_TOKEN'])
assert.equal(assertBadgeIdentitySeparation(identity), identity)
assert.throws(
  () => assertBadgeIdentitySeparation({ ...identity, outputId: identity.qrTokenId }),
  /aynı kimlik olamaz/,
)

assert.equal(
  buildBadgePdfFilename({
    firstName: 'Ayşe',
    lastName: 'Yılmaz',
    eventName: 'Ürün Zirvesi / 2026',
    formName: 'Katılımcı: Form',
    outputIdShort: identity.outputIdShort,
  }),
  'Ayşe-Yılmaz-Ürün-Zirvesi-2026-Katılımcı-Form-7K4M2P8Q9X6D.pdf',
)
assert.equal(
  buildBadgePdfFilename({
    firstName: 'Ayşe',
    lastName: 'Yılmaz',
    title: 'Dr. / CTO',
    eventName: 'Ürün Zirvesi',
    formName: 'Katılımcı',
    outputIdShort: identity.outputIdShort,
    collisionMode: 'WITH_TITLE',
  }),
  'Ayşe-Yılmaz-Dr.-CTO-Ürün-Zirvesi-Katılımcı-7K4M2P8Q9X6D.pdf',
)
assert.equal(
  buildBadgePdfFilename({
    firstName: 'CON',
    lastName: 'NUL',
    eventName: 'Etkinlik',
    formName: 'Form',
    outputIdShort: 'ABC123',
    collisionMode: 'OPAQUE_FALLBACK',
  }),
  'badge-ABC123.pdf',
)
assert.equal(normalizeBadgeFilenameSegment('  A/B\\C?.  '), 'A-B-C')
assert.equal(badgeFilenameCollisionKey('Ayşe-Yılmaz.pdf'), 'ayşe-yılmaz.pdf')
assert.equal(isPublicBadgeQrMode('PUBLIC_CARD_URL'), true)
assert.equal(isPublicBadgeQrMode('SECURE_TOKEN'), false)
assert.equal(isSecureBadgeQrMode('SECURE_TOKEN'), true)
assert.equal(isSecureBadgeQrMode('INLINE_VCARD'), false)
