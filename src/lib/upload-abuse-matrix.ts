import { validateSecureUpload, type SecureUploadValidationResult } from './invoice-document-validation'

export type UploadAbuseCategory = 'path_traversal' | 'polyglot' | 'macro_or_active_content' | 'archive_bomb' | 'invalid_magic' | 'invalid_type' | 'invalid_size' | 'archive_structure'

export type UploadAbuseResult =
  | { allowed: true; kind: 'pdf' | 'png' | 'jpeg' | 'webp' | 'xlsx'; size: number; sha256: string }
  | { allowed: false; category: UploadAbuseCategory; code: string }

function hasSignatureAfter(bytes: Uint8Array, signature: readonly number[], start: number): boolean {
  for (let offset = start; offset <= bytes.length - signature.length; offset += 1) {
    if (signature.every((value, index) => bytes[offset + index] === value)) return true
  }
  return false
}

function hasActiveContent(bytes: Uint8Array): boolean {
  const text = new TextDecoder('latin1').decode(bytes.slice(0, 2 * 1024 * 1024))
  return /macroenabled|vbaProject|\/JavaScript\b|\/JS\b|\/Launch\b|\/EmbeddedFile\b/i.test(text)
}

function classifyFailure(result: Extract<SecureUploadValidationResult, { ok: false }>, filename: string): UploadAbuseCategory {
  if (result.code === 'filename_invalid' && /(?:^|[/\\])\.\.?(?:[/\\]|$)|^[A-Za-z]:/u.test(filename)) return 'path_traversal'
  if (result.code === 'filename_invalid') return 'invalid_type'
  if (result.code === 'extension_invalid' || result.code === 'mime_invalid') return 'invalid_type'
  if (result.code === 'size_invalid' || result.code === 'size_mismatch') return 'invalid_size'
  if (result.code === 'magic_invalid') return 'invalid_magic'
  if (result.code === 'archive_path_traversal') return 'path_traversal'
  if (result.code === 'archive_macro') return 'macro_or_active_content'
  if (['archive_entry_size_limit', 'archive_size_limit', 'archive_ratio_limit'].includes(result.code)) return 'archive_bomb'
  if (result.code.startsWith('archive_')) return 'archive_structure'
  return 'archive_structure'
}

/** Adds non-parsing abuse signals to the shared upload validator without releasing quarantine. */
export function evaluateUploadAbuse(input: { filename: string; mime: string; size: number; bytes: Uint8Array }): UploadAbuseResult {
  const isXlsx = typeof input?.filename === 'string' && /\.xlsx$/i.test(input.filename)
  if (input?.bytes instanceof Uint8Array && !isXlsx && hasSignatureAfter(input.bytes, [0x50, 0x4b, 0x03, 0x04], 16)) return { allowed: false, category: 'polyglot', code: 'embedded_archive_signature' }
  if (input?.bytes instanceof Uint8Array && !isXlsx && hasSignatureAfter(input.bytes, [0x4d, 0x5a], 16)) return { allowed: false, category: 'polyglot', code: 'embedded_executable_signature' }
  if (input?.bytes instanceof Uint8Array && hasActiveContent(input.bytes)) return { allowed: false, category: 'macro_or_active_content', code: 'active_content_signature' }

  const validated = validateSecureUpload(input)
  if (!validated.ok) return { allowed: false, category: classifyFailure(validated, input?.filename ?? ''), code: validated.code }
  return { allowed: true, kind: validated.kind, size: validated.size, sha256: validated.sha256 }
}
