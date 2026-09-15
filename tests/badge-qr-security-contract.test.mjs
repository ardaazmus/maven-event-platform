import assert from 'node:assert/strict'
import { validateBadgeQrCredential } from '../src/lib/badge-qr-security-contract.ts'

const expectedScope = { workspaceId: 'workspace-1', formId: 'form-1', badgeInstanceId: 'badge-1' }
const base = { workspaceId: 'workspace-1', formId: 'form-1', badgeInstanceId: 'badge-1', revoked: false }

assert.deepEqual(validateBadgeQrCredential({ credential: { ...base, mode: 'SECURE_TOKEN', payload: 'opaqueToken_123456' }, expectedScope }), { ok: true, status: 'VALID', mode: 'SECURE_TOKEN' })
assert.deepEqual(validateBadgeQrCredential({ credential: { ...base, mode: 'PUBLIC_CARD_URL', payload: 'https://cards.example.test/c/opaqueCard_123456' }, expectedScope }), { ok: true, status: 'VALID', mode: 'PUBLIC_CARD_URL' })
assert.deepEqual(validateBadgeQrCredential({ credential: { ...base, mode: 'INLINE_VCARD', payload: 'BEGIN:VCARD\nFN:Public Card\nEND:VCARD' }, expectedScope, allowInlineVcard: true }), { ok: true, status: 'WARN_REQUIRES_CONFIRMATION', mode: 'INLINE_VCARD' })

assert.deepEqual(validateBadgeQrCredential({ credential: { ...base, mode: 'SECURE_TOKEN', payload: 'opaqueToken_123456', revoked: true }, expectedScope }), { ok: false, code: 'REVOKED' })
assert.deepEqual(validateBadgeQrCredential({ credential: { ...base, mode: 'SECURE_TOKEN', payload: 'opaqueToken_123456' }, expectedScope: { ...expectedScope, formId: 'form-2' } }), { ok: false, code: 'SCOPE_MISMATCH' })
assert.deepEqual(validateBadgeQrCredential({ credential: { ...base, mode: 'SECURE_TOKEN', payload: 'short' }, expectedScope }), { ok: false, code: 'OPAQUE_TOKEN_INVALID' })
assert.deepEqual(validateBadgeQrCredential({ credential: { ...base, mode: 'PUBLIC_CARD_URL', payload: 'http://cards.example.test/c/opaqueCard_123456' }, expectedScope }), { ok: false, code: 'PUBLIC_URL_INVALID' })
assert.deepEqual(validateBadgeQrCredential({ credential: { ...base, mode: 'PUBLIC_CARD_URL', payload: 'https://cards.example.test/c/opaqueCard_123456?email=hidden@example.test' }, expectedScope }), { ok: false, code: 'SENSITIVE_PAYLOAD' })
assert.deepEqual(validateBadgeQrCredential({ credential: { ...base, mode: 'INLINE_VCARD', payload: 'BEGIN:VCARD\nFN:Public Card\nEND:VCARD' }, expectedScope }), { ok: false, code: 'INLINE_VCARD_DISABLED' })
assert.deepEqual(validateBadgeQrCredential({ credential: { ...base, mode: 'SECURE_TOKEN', payload: 'opaqueToken_payment_123456' }, expectedScope }), { ok: false, code: 'SENSITIVE_PAYLOAD' })

console.log('badge-qr-security-contract: all assertions passed')
