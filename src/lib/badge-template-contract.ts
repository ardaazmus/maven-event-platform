export const BADGE_TEMPLATE_VISIBILITY = 'private' as const

export type BadgeTemplateValidationCode =
  | 'OK'
  | 'SCOPE_REQUIRED'
  | 'PRIVATE_ONLY'
  | 'PDF_REQUIRED'
  | 'PDF_SIGNATURE_INVALID'
  | 'FILE_TOO_LARGE'
  | 'PAGE_COUNT_INVALID'
  | 'DIMENSION_INVALID'
  | 'ACTIVE_CONTENT_REJECTED'

export type BadgeTemplateUpload = Readonly<{
  workspaceId: string
  formId: string
  originalName: string
  mime: string
  size: number
  bytes: Uint8Array
  pageCount: number
  widthPt: number
  heightPt: number
  visibility: typeof BADGE_TEMPLATE_VISIBILITY
}>

export type BadgeTemplatePolicy = Readonly<{
  maxBytes: number
  maxPages: 1 | 2
}>

export const DEFAULT_BADGE_TEMPLATE_POLICY: BadgeTemplatePolicy = {
  // Product cap; this is configurable and is not a universal print standard.
  maxBytes: 25 * 1024 * 1024,
  maxPages: 2,
}

function hasPdfSignature(bytes: Uint8Array) {
  return new TextDecoder('latin1').decode(bytes.slice(0, 5)) === '%PDF-'
}

function hasActivePdfContent(bytes: Uint8Array) {
  const text = new TextDecoder('latin1').decode(bytes)
  return /\/(?:JavaScript|JS|Launch|OpenAction|AA|EmbeddedFile)\b/.test(text)
}

export function validateBadgeTemplateUpload(
  upload: BadgeTemplateUpload,
  policy: BadgeTemplatePolicy = DEFAULT_BADGE_TEMPLATE_POLICY,
): { ok: true; code: 'OK' } | { ok: false; code: BadgeTemplateValidationCode } {
  if (!upload.workspaceId.trim() || !upload.formId.trim()) return { ok: false, code: 'SCOPE_REQUIRED' }
  if (upload.visibility !== BADGE_TEMPLATE_VISIBILITY) return { ok: false, code: 'PRIVATE_ONLY' }
  if (upload.mime !== 'application/pdf' || !upload.originalName.toLowerCase().endsWith('.pdf')) {
    return { ok: false, code: 'PDF_REQUIRED' }
  }
  if (!Number.isSafeInteger(upload.size) || upload.size !== upload.bytes.byteLength || upload.size <= 0 || upload.size > policy.maxBytes) {
    return { ok: false, code: 'FILE_TOO_LARGE' }
  }
  if (!hasPdfSignature(upload.bytes)) return { ok: false, code: 'PDF_SIGNATURE_INVALID' }
  if (!Number.isInteger(upload.pageCount) || upload.pageCount < 1 || upload.pageCount > policy.maxPages) {
    return { ok: false, code: 'PAGE_COUNT_INVALID' }
  }
  if (!Number.isFinite(upload.widthPt) || !Number.isFinite(upload.heightPt) || upload.widthPt <= 0 || upload.heightPt <= 0) {
    return { ok: false, code: 'DIMENSION_INVALID' }
  }
  if (hasActivePdfContent(upload.bytes)) return { ok: false, code: 'ACTIVE_CONTENT_REJECTED' }
  return { ok: true, code: 'OK' }
}

export function createBadgeTemplateStorageKey(input: Readonly<{
  workspaceId: string
  formId: string
  templateId: string
  versionId: string
}>) {
  const parts = [input.workspaceId, input.formId, input.templateId, input.versionId]
  if (parts.some(part => !part.trim() || part.includes('/') || part.includes('\\'))) {
    throw new Error('template storage kapsamı geçersiz')
  }
  return `private/workspaces/${input.workspaceId}/forms/${input.formId}/badge-templates/${input.templateId}/${input.versionId}/source.pdf`
}
