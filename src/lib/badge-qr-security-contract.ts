export type BadgeQrSecurityMode = 'NONE' | 'PUBLIC_CARD_URL' | 'INLINE_VCARD' | 'SECURE_TOKEN'
export type BadgeQrSecurityStatus = 'VALID' | 'WARN_REQUIRES_CONFIRMATION' | 'REVOKED'

export type BadgeQrCredential = Readonly<{
  mode: BadgeQrSecurityMode
  payload: string
  workspaceId: string
  formId: string
  badgeInstanceId: string
  revoked: boolean
}>

export type BadgeQrSecurityValidationCode =
  | 'OK'
  | 'QR_DISABLED'
  | 'SCOPE_INVALID'
  | 'SCOPE_MISMATCH'
  | 'REVOKED'
  | 'OPAQUE_TOKEN_INVALID'
  | 'PUBLIC_URL_INVALID'
  | 'SENSITIVE_PAYLOAD'
  | 'INLINE_VCARD_DISABLED'

const SENSITIVE_PAYLOAD_PATTERN = /(?:email|e[-_ ]?posta|phone|telefon|payment|ödeme|password|parola|secret|raw|answer|cevap|@|\+?\d[\d\s().-]{7,})/iu

function isSafeIdentifier(value: string) {
  return Boolean(value.trim()) && !/[\\/:\s]/u.test(value)
}

function hasSensitivePayload(payload: string) {
  return SENSITIVE_PAYLOAD_PATTERN.test(payload)
}

function validateScope(credential: BadgeQrCredential, expected: Readonly<{ workspaceId: string; formId: string; badgeInstanceId: string }>) {
  return [credential.workspaceId, credential.formId, credential.badgeInstanceId, expected.workspaceId, expected.formId, expected.badgeInstanceId].every(isSafeIdentifier)
}

export function validateBadgeQrCredential(input: Readonly<{
  credential: BadgeQrCredential
  expectedScope: Readonly<{ workspaceId: string; formId: string; badgeInstanceId: string }>
  allowInlineVcard?: boolean
}>): { ok: true; status: BadgeQrSecurityStatus; mode: Exclude<BadgeQrSecurityMode, 'NONE'> } | { ok: false; code: BadgeQrSecurityValidationCode } {
  const { credential, expectedScope } = input
  if (credential.mode === 'NONE') return { ok: false, code: 'QR_DISABLED' }
  if (!validateScope(credential, expectedScope)) return { ok: false, code: 'SCOPE_INVALID' }
  if (credential.workspaceId !== expectedScope.workspaceId || credential.formId !== expectedScope.formId || credential.badgeInstanceId !== expectedScope.badgeInstanceId) {
    return { ok: false, code: 'SCOPE_MISMATCH' }
  }
  if (credential.revoked) return { ok: false, code: 'REVOKED' }
  if (hasSensitivePayload(credential.payload)) return { ok: false, code: 'SENSITIVE_PAYLOAD' }

  if (credential.mode === 'SECURE_TOKEN') {
    if (!/^[A-Za-z0-9_-]{16,}$/u.test(credential.payload)) return { ok: false, code: 'OPAQUE_TOKEN_INVALID' }
    return { ok: true, status: 'VALID', mode: 'SECURE_TOKEN' }
  }

  if (credential.mode === 'PUBLIC_CARD_URL') {
    try {
      const url = new URL(credential.payload)
      const opaquePath = url.pathname.split('/').filter(Boolean).at(-1) ?? ''
      if (url.protocol !== 'https:' || url.search || url.hash || !/^[A-Za-z0-9_-]{16,}$/u.test(opaquePath)) return { ok: false, code: 'PUBLIC_URL_INVALID' }
    } catch {
      return { ok: false, code: 'PUBLIC_URL_INVALID' }
    }
    return { ok: true, status: 'VALID', mode: 'PUBLIC_CARD_URL' }
  }

  if (!input.allowInlineVcard) return { ok: false, code: 'INLINE_VCARD_DISABLED' }
  return { ok: true, status: 'WARN_REQUIRES_CONFIRMATION', mode: 'INLINE_VCARD' }
}
