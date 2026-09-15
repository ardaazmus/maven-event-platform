import { PDFDocument } from 'pdf-lib'
// @ts-expect-error Node strip-types tests require explicit TypeScript extensions.
import { buildBadgeExportPackage, type BadgeExportFaceMode, type BadgeExportPackage } from './badge-export-contract.ts'
// @ts-expect-error Node strip-types tests require explicit TypeScript extensions.
import { readReadyBadgePdfArtifact } from './badge-artifact-storage.ts'
import type { BadgeArtifactDescriptor } from './badge-artifact-storage-contract'

const MAX_EXPORT_BYTES = 100 * 1024 * 1024

export type BadgeExportArtifactInput = Readonly<{
  submissionId: string
  descriptor: BadgeArtifactDescriptor
  filename: string
  rootDir?: string
}>

export type BadgeExportPackageOutput = Readonly<{
  package: BadgeExportPackage
  combinedPdfBytes: Uint8Array
  zipBytes: Uint8Array
}> 

export type BadgeExportPackageErrorCode =
  | 'EXPORT_INVALID'
  | 'ARTIFACT_NOT_READY'
  | 'ARTIFACT_READ_FAILED'
  | 'PDF_INVALID'
  | 'PAGE_COUNT_MISMATCH'
  | 'EXPORT_TOO_LARGE'

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const output = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.byteLength
  }
  return output
}

function zipPart(signature: number, filename: Uint8Array, bytes: Uint8Array, offset = 0) {
  const header = new Uint8Array(signature === 0x04034b50 ? 30 : 46)
  const view = new DataView(header.buffer)
  view.setUint32(0, signature, true)
  if (signature === 0x04034b50) {
    view.setUint16(4, 20, true)
    view.setUint16(6, 0x800, true)
    view.setUint16(8, 0, true)
    view.setUint32(14, crc32(bytes), true)
    view.setUint32(18, bytes.byteLength, true)
    view.setUint32(22, bytes.byteLength, true)
    view.setUint16(26, filename.byteLength, true)
  } else {
    view.setUint16(4, 20, true)
    view.setUint16(6, 20, true)
    view.setUint16(8, 0x800, true)
    view.setUint32(16, crc32(bytes), true)
    view.setUint32(20, bytes.byteLength, true)
    view.setUint32(24, bytes.byteLength, true)
    view.setUint16(28, filename.byteLength, true)
    view.setUint32(42, offset, true)
  }
  return concat([header, filename, bytes])
}

function createZip(files: ReadonlyArray<Readonly<{ filename: string; bytes: Uint8Array }>>) {
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0
  for (const file of files) {
    const filename = new TextEncoder().encode(file.filename)
    const local = zipPart(0x04034b50, filename, file.bytes)
    localParts.push(local)
    centralParts.push(zipPart(0x02014b50, filename, file.bytes, offset))
    offset += local.byteLength
  }
  const central = concat(centralParts)
  const locals = concat(localParts)
  const end = new Uint8Array(22)
  const view = new DataView(end.buffer)
  view.setUint32(0, 0x06054b50, true)
  view.setUint16(8, files.length, true)
  view.setUint16(10, files.length, true)
  view.setUint32(12, central.byteLength, true)
  view.setUint32(16, locals.byteLength, true)
  return concat([locals, central, end])
}

function expectedPages(faceMode: BadgeExportFaceMode) {
  return faceMode === 'SINGLE_FACE' ? 1 : 2
}

export async function exportBadgeArtifacts(input: Readonly<{
  jobId: string
  workspaceId: string
  formId: string
  templateVersionId: string
  printProfileId: string
  faceMode: BadgeExportFaceMode
  entries: ReadonlyArray<BadgeExportArtifactInput>
}>): Promise<{ ok: true; output: BadgeExportPackageOutput } | { ok: false; code: BadgeExportPackageErrorCode; value?: string }> {
  const built = buildBadgeExportPackage({
    jobId: input.jobId,
    workspaceId: input.workspaceId,
    formId: input.formId,
    templateVersionId: input.templateVersionId,
    printProfileId: input.printProfileId,
    faceMode: input.faceMode,
    entries: input.entries.map(entry => ({ submissionId: entry.submissionId, artifactId: entry.descriptor.artifactId, filename: entry.filename, status: 'SUCCEEDED' as const })),
  })
  if (!built.ok) return { ok: false, code: 'EXPORT_INVALID', value: built.value }

  const pdfs: Array<{ filename: string; bytes: Uint8Array }> = []
  const combined = await PDFDocument.create()
  for (const entry of input.entries) {
    if (entry.descriptor.state !== 'READY' || !entry.descriptor.downloadable) return { ok: false, code: 'ARTIFACT_NOT_READY', value: entry.descriptor.artifactId }
    const read = await readReadyBadgePdfArtifact({ descriptor: entry.descriptor, rootDir: entry.rootDir })
    if (!read.ok) return { ok: false, code: 'ARTIFACT_READ_FAILED', value: entry.descriptor.artifactId }
    try {
      const source = await PDFDocument.load(read.bytes, { ignoreEncryption: false, updateMetadata: false })
      if (source.getPageCount() !== expectedPages(input.faceMode)) return { ok: false, code: 'PAGE_COUNT_MISMATCH', value: entry.descriptor.artifactId }
      const pages = await combined.copyPages(source, source.getPageIndices())
      pages.forEach(page => combined.addPage(page))
    } catch {
      return { ok: false, code: 'PDF_INVALID', value: entry.descriptor.artifactId }
    }
    pdfs.push({ filename: entry.filename, bytes: read.bytes })
  }
  const combinedPdfBytes = await combined.save({ useObjectStreams: true, addDefaultPage: false })
  const manifestBytes = new TextEncoder().encode(JSON.stringify(built.package.manifest))
  const zipBytes = createZip([
    { filename: built.package.combinedPdfName, bytes: combinedPdfBytes },
    ...pdfs,
    { filename: 'manifest.json', bytes: manifestBytes },
  ])
  if (combinedPdfBytes.byteLength > MAX_EXPORT_BYTES || zipBytes.byteLength > MAX_EXPORT_BYTES) return { ok: false, code: 'EXPORT_TOO_LARGE' }
  return { ok: true, output: { package: built.package, combinedPdfBytes, zipBytes } }
}
