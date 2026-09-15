import { createHash } from 'node:crypto'
import { inflateRawSync } from 'node:zlib'

export const INVOICE_DOCUMENT_MAX_SIZE = 10 * 1024 * 1024
export const INVOICE_ARCHIVE_MAX_ENTRIES = 1_000
export const INVOICE_ARCHIVE_MAX_ENTRY_SIZE = 20 * 1024 * 1024
export const INVOICE_ARCHIVE_MAX_UNCOMPRESSED_SIZE = 50 * 1024 * 1024

const PDF_MIME = 'application/pdf'
const XML_MIMES = ['application/xml', 'text/xml'] as const

export type InvoiceDocumentKind = 'pdf' | 'xml'
export type InvoiceArchiveKind = 'zip'

export type InvoiceDocumentValidationError =
  | 'filename_invalid'
  | 'extension_invalid'
  | 'mime_invalid'
  | 'size_invalid'
  | 'size_mismatch'
  | 'magic_invalid'
  | 'encoding_invalid'
  | 'xml_external_reference'

export type InvoiceDocumentValidationResult =
  | { ok: true; kind: InvoiceDocumentKind; detectedMime: string; size: number; sha256: string }
  | { ok: false; code: InvoiceDocumentValidationError }

export type InvoiceArchiveValidationError =
  | InvoiceDocumentValidationError
  | 'archive_invalid'
  | 'archive_encoding_invalid'
  | 'archive_entry_limit'
  | 'archive_entry_size_limit'
  | 'archive_size_limit'
  | 'archive_ratio_limit'
  | 'archive_path_traversal'
  | 'archive_duplicate_entry'
  | 'archive_encrypted'
  | 'archive_compression_invalid'
  | 'archive_nested'
  | 'archive_macro'
  | 'archive_external_link'
  | 'archive_structure_invalid'

export type InvoiceArchiveValidationResult =
  | { ok: true; kind: 'xlsx'; archiveKind: InvoiceArchiveKind; detectedMime: string; size: number; entryCount: number; uncompressedBytes: number; sha256: string }
  | { ok: false; code: InvoiceArchiveValidationError }

export type SecureUploadKind = 'pdf' | 'png' | 'jpeg' | 'webp' | 'xlsx'

export type SecureUploadValidationResult =
  | { ok: true; kind: SecureUploadKind; detectedMime: string; size: number; sha256: string }
  | { ok: false; code: InvoiceArchiveValidationError }

function fail(code: InvoiceDocumentValidationError): InvoiceDocumentValidationResult {
  return { ok: false, code }
}

function validFilename(filename: unknown): filename is string {
  if (typeof filename !== 'string' || filename.length === 0 || filename.length > 255 || /[\u0000-\u001F\u007F]/.test(filename)) return false
  return filename === filename.replace(/\\/g, '/').split('/').pop()
}

function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

function hasPdfMagic(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-'
}

function hasPngMagic(bytes: Uint8Array): boolean {
  return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)
}

function hasJpegMagic(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

function hasWebpMagic(bytes: Uint8Array): boolean {
  return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
}

function hasXmlMagic(bytes: Uint8Array): boolean {
  const text = decodeUtf8(bytes)
  if (text === null) return false
  const withoutBom = text.replace(/^\uFEFF/, '').trimStart()
  if (!withoutBom.startsWith('<')) return false
  if (/<!DOCTYPE\b|<!ENTITY\b|<\?xml-stylesheet\b/i.test(text)) return false
  return true
}

function kindForExtension(filename: string): InvoiceDocumentKind | null {
  const extension = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase()
  return extension === 'pdf' ? 'pdf' : extension === 'xml' ? 'xml' : null
}

function secureKindForExtension(filename: string): SecureUploadKind | null {
  const extension = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase()
  if (extension === 'pdf') return 'pdf'
  if (extension === 'png') return 'png'
  if (extension === 'jpg' || extension === 'jpeg') return 'jpeg'
  if (extension === 'webp') return 'webp'
  return extension === 'xlsx' ? 'xlsx' : null
}

function secureMimeMatches(kind: SecureUploadKind, mime: unknown): boolean {
  if (kind === 'pdf') return mime === PDF_MIME
  if (kind === 'png') return mime === 'image/png'
  if (kind === 'jpeg') return mime === 'image/jpeg'
  if (kind === 'webp') return mime === 'image/webp'
  return typeof mime === 'string' && ['application/zip', 'application/octet-stream', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(mime)
}

function secureMagicMatches(kind: Exclude<SecureUploadKind, 'xlsx'>, bytes: Uint8Array): boolean {
  if (kind === 'pdf') return hasPdfMagic(bytes)
  if (kind === 'png') return hasPngMagic(bytes)
  if (kind === 'jpeg') return hasJpegMagic(bytes)
  return hasWebpMagic(bytes)
}

function mimeMatches(kind: InvoiceDocumentKind, mime: unknown): boolean {
  return kind === 'pdf' ? mime === PDF_MIME : typeof mime === 'string' && (XML_MIMES as readonly string[]).includes(mime)
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function readUInt16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8)
}

function readUInt32(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0
}

function archiveFail(code: InvoiceArchiveValidationError): InvoiceArchiveValidationResult {
  return { ok: false, code }
}

function archiveFilenameSafe(name: string): boolean {
  if (!name || /[\u0000-\u001F\u007F]/.test(name) || name.includes('\\') || name.startsWith('/') || /^[A-Za-z]:/.test(name)) return false
  return !name.split('/').some((part) => part === '' || part === '.' || part === '..')
}

function archiveFilename(nameBytes: Uint8Array): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(nameBytes)
  } catch {
    return null
  }
}

function isExecutableEntry(name: string): boolean {
  return /(?:^|\/)(?:vbaProject\.bin|[^/]+\.(?:bin|cmd|com|dll|exe|js|ps1|scr|sh|vbe|vbs|wsf))$/i.test(name)
}

function isNestedArchive(name: string, bytes: Uint8Array): boolean {
  const lower = name.toLowerCase()
  if (/\.(?:7z|rar|tar|zip)$/.test(lower)) return true
  return (bytes.length >= 4 && readUInt32(bytes, 0) === 0x04034b50)
    || (bytes.length >= 6 && String.fromCharCode(...bytes.slice(0, 6)) === '7z\u001f\u0000\u0000\u0000')
    || (bytes.length >= 7 && String.fromCharCode(...bytes.slice(0, 7)) === 'Rar!\u001a\u0007')
    || (bytes.length >= 265 && String.fromCharCode(...bytes.slice(257, 262)) === 'ustar')
}

function hasExternalXmlReference(bytes: Uint8Array): 'encoding' | 'external' | 'macro' | null {
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return 'encoding'
  }
  if (/macroenabled|vbaProject|application\/vnd\.ms-office\.vbaProject/i.test(text)) return 'macro'
  if (/<!DOCTYPE\b|<!ENTITY\b|<\?xml-stylesheet\b/i.test(text)) return 'external'
  if (/<(?:[\w.-]+:)?externalLink\b|TargetMode\s*=\s*["']External["']|Target\s*=\s*["'](?:https?|file|ftp|data):/i.test(text)) return 'external'
  return null
}

function findEndOfCentralDirectory(bytes: Uint8Array): number | null {
  const first = Math.max(0, bytes.length - 22 - 0xffff)
  for (let offset = bytes.length - 22; offset >= first; offset -= 1) {
    if (offset >= 0 && readUInt32(bytes, offset) === 0x06054b50 && offset + 22 <= bytes.length && offset + 22 + readUInt16(bytes, offset + 20) === bytes.length) return offset
  }
  return null
}

/**
 * Validates a PDF/XML artifact before storage or parsing. This is a file-type
 * boundary only: it never parses XML/PDF and never changes invoice state.
 */
export function validateInvoiceDocumentUpload(input: {
  filename: string
  mime: string
  size: number
  bytes: Uint8Array
}): InvoiceDocumentValidationResult {
  if (!validFilename(input?.filename)) return fail('filename_invalid')
  const kind = kindForExtension(input.filename)
  if (!kind) return fail('extension_invalid')
  if (!mimeMatches(kind, input?.mime)) return fail('mime_invalid')
  if (!(input?.bytes instanceof Uint8Array) || !Number.isSafeInteger(input?.size) || input.size <= 0 || input.size > INVOICE_DOCUMENT_MAX_SIZE) return fail('size_invalid')
  if (input.size !== input.bytes.byteLength) return fail('size_mismatch')

  const magicValid = kind === 'pdf' ? hasPdfMagic(input.bytes) : hasXmlMagic(input.bytes)
  if (!magicValid) {
    const xmlText = kind === 'xml' ? decodeUtf8(input.bytes) : null
    return kind === 'xml' && xmlText === null ? fail('encoding_invalid') : kind === 'xml' && /<!DOCTYPE\b|<!ENTITY\b|<\?xml-stylesheet\b/i.test(xmlText ?? '') ? fail('xml_external_reference') : fail('magic_invalid')
  }

  return { ok: true, kind, detectedMime: kind === 'pdf' ? PDF_MIME : input.mime, size: input.bytes.byteLength, sha256: sha256(input.bytes) }
}

/**
 * Validates the shared media/document upload boundary for files that may be
 * selected by the form, badge or invoice flows. XLSX validation delegates to
 * the bounded archive validator; successful results expose metadata only.
 */
export function validateSecureUpload(input: {
  filename: string
  mime: string
  size: number
  bytes: Uint8Array
}): SecureUploadValidationResult {
  if (!validFilename(input?.filename)) return { ok: false, code: 'filename_invalid' }
  const kind = secureKindForExtension(input.filename)
  if (!kind) return { ok: false, code: 'extension_invalid' }
  if (!secureMimeMatches(kind, input?.mime)) return { ok: false, code: 'mime_invalid' }
  if (!(input?.bytes instanceof Uint8Array) || !Number.isSafeInteger(input?.size) || input.size <= 0 || input.size > INVOICE_DOCUMENT_MAX_SIZE) return { ok: false, code: 'size_invalid' }
  if (input.size !== input.bytes.byteLength) return { ok: false, code: 'size_mismatch' }

  if (kind === 'xlsx') {
    const archive = validateInvoiceArchiveUpload(input)
    return archive.ok ? { ok: true, kind: 'xlsx', detectedMime: archive.detectedMime, size: archive.size, sha256: archive.sha256 } : archive
  }
  if (!secureMagicMatches(kind, input.bytes)) return { ok: false, code: 'magic_invalid' }
  return { ok: true, kind, detectedMime: input.mime, size: input.bytes.byteLength, sha256: sha256(input.bytes) }
}

/**
 * Validates an XLSX ZIP package before quarantine release. It reads only ZIP
 * metadata and bounded entry bytes; it never parses a worksheet or executes a
 * package part. Macro, external-reference, traversal and decompression-risk
 * surfaces fail closed.
 */
export function validateInvoiceArchiveUpload(input: {
  filename: string
  mime: string
  size: number
  bytes: Uint8Array
}): InvoiceArchiveValidationResult {
  if (!validFilename(input?.filename)) return archiveFail('filename_invalid')
  if (!/\.xlsx$/i.test(input.filename)) return archiveFail('extension_invalid')
  if (!['application/zip', 'application/octet-stream', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(input?.mime)) return archiveFail('mime_invalid')
  if (!(input?.bytes instanceof Uint8Array) || !Number.isSafeInteger(input?.size) || input.size <= 0 || input.size > INVOICE_DOCUMENT_MAX_SIZE) return archiveFail('size_invalid')
  if (input.size !== input.bytes.byteLength) return archiveFail('size_mismatch')
  if (input.bytes.length < 22 || readUInt32(input.bytes, 0) !== 0x04034b50) return archiveFail('magic_invalid')

  const eocd = findEndOfCentralDirectory(input.bytes)
  if (eocd === null) return archiveFail('archive_invalid')
  const disk = readUInt16(input.bytes, eocd + 4)
  const centralDisk = readUInt16(input.bytes, eocd + 6)
  const diskEntries = readUInt16(input.bytes, eocd + 8)
  const entryCount = readUInt16(input.bytes, eocd + 10)
  const centralSize = readUInt32(input.bytes, eocd + 12)
  const centralOffset = readUInt32(input.bytes, eocd + 16)
  if (disk !== 0 || centralDisk !== 0 || diskEntries !== entryCount || entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) return archiveFail('archive_invalid')
  if (entryCount === 0 || entryCount > INVOICE_ARCHIVE_MAX_ENTRIES || centralOffset > input.bytes.length || centralSize > input.bytes.length - centralOffset || centralOffset + centralSize > eocd) return archiveFail('archive_entry_limit')

  const names = new Set<string>()
  const ranges: Array<[number, number]> = []
  const required = new Set(['[Content_Types].xml', 'xl/workbook.xml'])
  let uncompressedBytes = 0
  let offset = centralOffset

  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > centralOffset + centralSize || readUInt32(input.bytes, offset) !== 0x02014b50) return archiveFail('archive_invalid')
    const flags = readUInt16(input.bytes, offset + 8)
    const method = readUInt16(input.bytes, offset + 10)
    const compressedSize = readUInt32(input.bytes, offset + 20)
    const entrySize = readUInt32(input.bytes, offset + 24)
    const nameLength = readUInt16(input.bytes, offset + 28)
    const extraLength = readUInt16(input.bytes, offset + 30)
    const commentLength = readUInt16(input.bytes, offset + 32)
    const entryOffset = readUInt32(input.bytes, offset + 42)
    const recordSize = 46 + nameLength + extraLength + commentLength
    if (recordSize > centralOffset + centralSize - offset || compressedSize === 0xffffffff || entrySize === 0xffffffff || entryOffset === 0xffffffff) return archiveFail('archive_invalid')

    const name = archiveFilename(input.bytes.slice(offset + 46, offset + 46 + nameLength))
    if (name === null) return archiveFail('archive_encoding_invalid')
    if (!archiveFilenameSafe(name)) return archiveFail('archive_path_traversal')
    if (names.has(name)) return archiveFail('archive_duplicate_entry')
    names.add(name)
    required.delete(name)
    if ((flags & 1) !== 0) return archiveFail('archive_encrypted')
    if (method !== 0 && method !== 8) return archiveFail('archive_compression_invalid')
    if (entrySize > INVOICE_ARCHIVE_MAX_ENTRY_SIZE) return archiveFail('archive_entry_size_limit')
    uncompressedBytes += entrySize
    if (uncompressedBytes > INVOICE_ARCHIVE_MAX_UNCOMPRESSED_SIZE) return archiveFail('archive_size_limit')
    if (entrySize > 1024 * 1024 && (compressedSize === 0 || entrySize / compressedSize > 100)) return archiveFail('archive_ratio_limit')
    if (isExecutableEntry(name) || /macroenabled|vbaProject/i.test(name)) return archiveFail('archive_macro')
    if (/xl\/externalLinks(?:\/|$)|xl\/connections\.xml$/i.test(name)) return archiveFail('archive_external_link')

    if (entryOffset + 30 > centralOffset || readUInt32(input.bytes, entryOffset) !== 0x04034b50) return archiveFail('archive_invalid')
    const localFlags = readUInt16(input.bytes, entryOffset + 6)
    const localMethod = readUInt16(input.bytes, entryOffset + 8)
    const localNameLength = readUInt16(input.bytes, entryOffset + 26)
    const localExtraLength = readUInt16(input.bytes, entryOffset + 28)
    if (localFlags !== flags || localMethod !== method || entryOffset + 30 + localNameLength + localExtraLength > centralOffset) return archiveFail('archive_invalid')
    const dataStart = entryOffset + 30 + localNameLength + localExtraLength
    if (compressedSize > centralOffset - dataStart) return archiveFail('archive_invalid')
    const dataEnd = dataStart + compressedSize
    const range: [number, number] = [entryOffset, dataEnd]
    if (ranges.some(([start, end]) => range[0] < end && start < range[1])) return archiveFail('archive_invalid')
    ranges.push(range)

    let plain: Uint8Array
    try {
      const compressed = input.bytes.slice(dataStart, dataEnd)
      plain = method === 0 ? compressed : inflateRawSync(compressed, { maxOutputLength: INVOICE_ARCHIVE_MAX_ENTRY_SIZE })
    } catch {
      return archiveFail('archive_invalid')
    }
    if (plain.byteLength !== entrySize) return archiveFail('archive_invalid')
    if (isNestedArchive(name, plain)) return archiveFail('archive_nested')
    if (/\.(?:xml|rels)$/i.test(name)) {
      const xmlRisk = hasExternalXmlReference(plain)
      if (xmlRisk === 'encoding') return archiveFail('archive_encoding_invalid')
      if (xmlRisk === 'external') return archiveFail('archive_external_link')
      if (xmlRisk === 'macro') return archiveFail('archive_macro')
    }
    offset += recordSize
  }

  if (offset !== centralOffset + centralSize || required.size !== 0 || !names.has('xl/worksheets/sheet1.xml')) return archiveFail('archive_structure_invalid')
  return { ok: true, kind: 'xlsx', archiveKind: 'zip', detectedMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: input.bytes.byteLength, entryCount, uncompressedBytes, sha256: sha256(input.bytes) }
}
