export const BADGE_TEMPLATE_VISIBILITY = 'private' as const

export type BadgeTemplateFormat = 'pdf' | 'png' | 'jpeg' | 'webp'

export type BadgeTemplateValidationCode =
  | 'OK'
  | 'SCOPE_REQUIRED'
  | 'PRIVATE_ONLY'
  | 'FORMAT_REQUIRED'
  | 'FORMAT_MISMATCH'
  | 'SIGNATURE_INVALID'
  | 'FILE_TOO_LARGE'
  | 'PAGE_COUNT_INVALID'
  | 'DIMENSION_INVALID'
  | 'PIXEL_COUNT_INVALID'
  | 'ACTIVE_CONTENT_REJECTED'

export type BadgeTemplateUpload = Readonly<{
  workspaceId: string
  formId: string
  originalName: string
  mime: string
  size: number
  bytes: Uint8Array
  pageCount: number
  /** PDF için point, raster için piksel (decoder tarafından ölçülür). */
  widthPt: number
  heightPt: number
  visibility: typeof BADGE_TEMPLATE_VISIBILITY
}>

export type BadgeTemplatePolicy = Readonly<{
  maxBytes: number
  maxPages: 1 | 2
  maxPixels: number
}>

export const DEFAULT_BADGE_TEMPLATE_POLICY: BadgeTemplatePolicy = {
  // Product caps; these are configurable and are not universal print standards.
  maxBytes: 25 * 1024 * 1024,
  maxPages: 2,
  maxPixels: 25 * 1000 * 1000,
}

const MIME_FORMATS: Readonly<Record<string, BadgeTemplateFormat>> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/webp': 'webp',
}

const EXTENSION_FORMATS: Readonly<Record<string, BadgeTemplateFormat>> = {
  '.pdf': 'pdf',
  '.png': 'png',
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.webp': 'webp',
}

const FORMAT_EXTENSIONS: Readonly<Record<BadgeTemplateFormat, string>> = {
  pdf: 'pdf',
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
}

function extensionOf(originalName: string): string {
  const dot = originalName.toLowerCase().lastIndexOf('.')
  return dot === -1 ? '' : originalName.toLowerCase().slice(dot)
}

function startsWithBytes(bytes: Uint8Array, prefix: readonly number[]): boolean {
  if (bytes.byteLength < prefix.length) return false
  return prefix.every((value, index) => bytes[index] === value)
}

function detectFormatByMagic(bytes: Uint8Array): BadgeTemplateFormat | null {
  if (startsWithBytes(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf' // %PDF-
  if (startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) return 'jpeg'
  if (
    bytes.byteLength >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'webp' // RIFF....WEBP
  }
  return null
}

function hasActivePdfContent(bytes: Uint8Array) {
  const text = new TextDecoder('latin1').decode(bytes)
  return /\/(?:JavaScript|JS|Launch|OpenAction|AA|EmbeddedFile)\b/.test(text)
}

export function validateBadgeTemplateUpload(
  upload: BadgeTemplateUpload,
  policy: BadgeTemplatePolicy = DEFAULT_BADGE_TEMPLATE_POLICY,
): { ok: true; code: 'OK'; format: BadgeTemplateFormat } | { ok: false; code: BadgeTemplateValidationCode } {
  if (!upload.workspaceId.trim() || !upload.formId.trim()) return { ok: false, code: 'SCOPE_REQUIRED' }
  if (upload.visibility !== BADGE_TEMPLATE_VISIBILITY) return { ok: false, code: 'PRIVATE_ONLY' }
  const mimeFormat = MIME_FORMATS[upload.mime.toLowerCase()]
  const extensionFormat = EXTENSION_FORMATS[extensionOf(upload.originalName)]
  if (!mimeFormat || !extensionFormat) return { ok: false, code: 'FORMAT_REQUIRED' }
  const magicFormat = detectFormatByMagic(upload.bytes)
  if (!magicFormat) return { ok: false, code: 'SIGNATURE_INVALID' }
  if (mimeFormat !== extensionFormat || mimeFormat !== magicFormat) {
    return { ok: false, code: 'FORMAT_MISMATCH' }
  }
  if (!Number.isSafeInteger(upload.size) || upload.size !== upload.bytes.byteLength || upload.size <= 0 || upload.size > policy.maxBytes) {
    return { ok: false, code: 'FILE_TOO_LARGE' }
  }
  if (!Number.isFinite(upload.widthPt) || !Number.isFinite(upload.heightPt) || upload.widthPt <= 0 || upload.heightPt <= 0) {
    return { ok: false, code: 'DIMENSION_INVALID' }
  }
  if (magicFormat === 'pdf') {
    if (!Number.isInteger(upload.pageCount) || upload.pageCount < 1 || upload.pageCount > policy.maxPages) {
      return { ok: false, code: 'PAGE_COUNT_INVALID' }
    }
    if (hasActivePdfContent(upload.bytes)) return { ok: false, code: 'ACTIVE_CONTENT_REJECTED' }
    return { ok: true, code: 'OK', format: 'pdf' }
  }
  if (!Number.isInteger(upload.pageCount) || upload.pageCount !== 1) {
    return { ok: false, code: 'PAGE_COUNT_INVALID' }
  }
  if (upload.widthPt * upload.heightPt > policy.maxPixels) {
    return { ok: false, code: 'PIXEL_COUNT_INVALID' }
  }
  return { ok: true, code: 'OK', format: magicFormat }
}

export function createBadgeTemplateStorageKey(
  input: Readonly<{
    workspaceId: string
    formId: string
    templateId: string
    versionId: string
  }>,
  format: BadgeTemplateFormat = 'pdf',
) {
  const parts = [input.workspaceId, input.formId, input.templateId, input.versionId]
  if (parts.some(part => !part.trim() || part.includes('/') || part.includes('\\'))) {
    throw new Error('template storage kapsamı geçersiz')
  }
  return `private/workspaces/${input.workspaceId}/forms/${input.formId}/badge-templates/${input.templateId}/${input.versionId}/source.${FORMAT_EXTENSIONS[format]}`
}
