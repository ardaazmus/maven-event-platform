import { createHash } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
// @ts-expect-error Node strip-types tests require explicit TypeScript extensions.
import { createBadgeArtifactDescriptor, type BadgeArtifactDescriptor } from './badge-artifact-storage-contract.ts'
// @ts-expect-error Node strip-types tests require explicit TypeScript extensions.
import { advanceBadgeArtifactScan, type BadgeArtifactScanEvent } from './badge-artifact-scan-contract.ts'

export const BADGE_ARTIFACT_ROOT = process.env.BADGE_ARTIFACT_ROOT || 'storage/badges'

type BadgeArtifactScope = Readonly<{
  workspaceId: string
  formId: string
  artifactId: string
  outputId: string
}>

export type BadgeArtifactManifest = Readonly<{
  descriptor: BadgeArtifactDescriptor
  filename: string
  metadata?: BadgeArtifactMetadata
}>

export type BadgeArtifactMetadata = Readonly<{
  submissionId: string
  jobId: string
  templateVersionId: string
  printProfileId: string
  faceMode: 'SINGLE_FACE' | 'DUAL_FACE'
}>

export type BadgeArtifactStorageErrorCode =
  | 'IDENTIFIER_INVALID'
  | 'PDF_REQUIRED'
  | 'SIZE_INVALID'
  | 'WRITE_CONFLICT'
  | 'WRITE_FAILED'
  | 'SCAN_TRANSITION_INVALID'
  | 'NOT_READY'
  | 'STORAGE_KEY_INVALID'
  | 'READ_FAILED'
  | 'CHECKSUM_MISMATCH'

function isSafeIdentifier(value: string) {
  return /^[A-Za-z0-9_-]{1,128}$/u.test(value)
}

function isPdf(bytes: Uint8Array) {
  return new TextDecoder('latin1').decode(bytes.slice(0, 5)) === '%PDF-'
}

function artifactStorageKey(scope: BadgeArtifactScope) {
  return `badge/${scope.workspaceId}/${scope.formId}/${scope.artifactId}/${scope.outputId}.pdf`
}

function isSafeFilename(value: string) {
  return /^[^\\/:*?"<>|\u0000-\u001f]{1,255}\.pdf$/iu.test(value)
}

function resolveArtifactPath(rootDir: string, storageKey: string) {
  const root = path.resolve(rootDir)
  const fullPath = path.resolve(root, storageKey)
  if (fullPath !== root && !fullPath.startsWith(`${root}${path.sep}`)) return null
  return fullPath
}

function manifestPathFor(rootDir: string, scope: Readonly<Pick<BadgeArtifactScope, 'workspaceId' | 'formId' | 'artifactId'>>) {
  return resolveArtifactPath(rootDir, `badge/${scope.workspaceId}/${scope.formId}/${scope.artifactId}/manifest.json`)
}

function sha256(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex')
}

function validateScope(scope: BadgeArtifactScope) {
  return [scope.workspaceId, scope.formId, scope.artifactId, scope.outputId].every(isSafeIdentifier)
}

function isValidMetadata(metadata: unknown): metadata is BadgeArtifactMetadata {
  if (!metadata || typeof metadata !== 'object') return false
  const value = metadata as Partial<BadgeArtifactMetadata>
  return [value.submissionId, value.jobId, value.templateVersionId, value.printProfileId].every(item => typeof item === 'string' && isSafeIdentifier(item)) && (value.faceMode === 'SINGLE_FACE' || value.faceMode === 'DUAL_FACE')
}

export async function storeBadgePdfArtifact(input: Readonly<{
  scope: BadgeArtifactScope
  bytes: Uint8Array
  rootDir?: string
  filename?: string
  metadata?: BadgeArtifactMetadata
}>): Promise<{ ok: true; descriptor: BadgeArtifactDescriptor } | { ok: false; code: BadgeArtifactStorageErrorCode }> {
  if (!validateScope(input.scope)) return { ok: false, code: 'IDENTIFIER_INVALID' }
  if (!isPdf(input.bytes)) return { ok: false, code: 'PDF_REQUIRED' }
  if (!Number.isSafeInteger(input.bytes.byteLength) || input.bytes.byteLength < 1 || input.bytes.byteLength > 20_000_000) {
    return { ok: false, code: 'SIZE_INVALID' }
  }

  const storageKey = artifactStorageKey(input.scope)
  const fullPath = resolveArtifactPath(input.rootDir ?? BADGE_ARTIFACT_ROOT, storageKey)
  if (!fullPath) return { ok: false, code: 'STORAGE_KEY_INVALID' }
  const filename = input.filename ?? `badge-${input.scope.outputId}.pdf`
  if (!isSafeFilename(filename)) return { ok: false, code: 'STORAGE_KEY_INVALID' }
  const manifestPath = path.join(path.dirname(fullPath), 'manifest.json')
  try {
    await mkdir(path.dirname(fullPath), { recursive: true })
    await writeFile(fullPath, input.bytes, { flag: 'wx' })
    const descriptor = createBadgeArtifactDescriptor({
      artifactId: input.scope.artifactId,
      workspaceId: input.scope.workspaceId,
      formId: input.scope.formId,
      outputId: input.scope.outputId,
      storageKey,
      mimeType: 'application/pdf',
      sizeBytes: input.bytes.byteLength,
      sha256: sha256(input.bytes),
      scanStatus: 'PENDING',
    })
    if (!descriptor.ok) {
      await unlink(fullPath).catch(() => undefined)
      return { ok: false, code: 'STORAGE_KEY_INVALID' }
    }
    await writeFile(manifestPath, JSON.stringify({ descriptor: descriptor.descriptor, filename, ...(input.metadata ? { metadata: input.metadata } : {}) }), { flag: 'wx' })
    return descriptor
  } catch (error) {
    await unlink(fullPath).catch(() => undefined)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST') return { ok: false, code: 'WRITE_CONFLICT' }
    return { ok: false, code: 'WRITE_FAILED' }
  }
}

export async function readBadgeArtifactManifest(input: Readonly<{
  scope: Readonly<Pick<BadgeArtifactScope, 'workspaceId' | 'formId' | 'artifactId'>>
  rootDir?: string
}>): Promise<{ ok: true; manifest: BadgeArtifactManifest } | { ok: false; code: BadgeArtifactStorageErrorCode }> {
  if (![input.scope.workspaceId, input.scope.formId, input.scope.artifactId].every(isSafeIdentifier)) return { ok: false, code: 'IDENTIFIER_INVALID' }
  const manifestPath = manifestPathFor(input.rootDir ?? BADGE_ARTIFACT_ROOT, input.scope)
  if (!manifestPath) return { ok: false, code: 'STORAGE_KEY_INVALID' }
  try {
    const parsed: unknown = JSON.parse(await readFile(manifestPath, 'utf8'))
    if (!parsed || typeof parsed !== 'object' || !('descriptor' in parsed) || !('filename' in parsed)) return { ok: false, code: 'READ_FAILED' }
    const value = parsed as { descriptor: Parameters<typeof createBadgeArtifactDescriptor>[0] & { state?: string }; filename: unknown; metadata?: unknown }
    if (typeof value.filename !== 'string' || !isSafeFilename(value.filename)) return { ok: false, code: 'READ_FAILED' }
    const scanStatus = value.descriptor.state === 'READY' ? 'PASSED' : value.descriptor.state === 'BLOCKED' ? 'FAILED' : 'PENDING'
    const descriptor = createBadgeArtifactDescriptor({ ...value.descriptor, scanStatus })
    if (!descriptor.ok || descriptor.descriptor.workspaceId !== input.scope.workspaceId || descriptor.descriptor.formId !== input.scope.formId || descriptor.descriptor.artifactId !== input.scope.artifactId) {
      return { ok: false, code: 'READ_FAILED' }
    }
    const metadata = value.metadata === undefined ? undefined : isValidMetadata(value.metadata) ? value.metadata : null
    if (metadata === null) return { ok: false, code: 'READ_FAILED' }
    return { ok: true, manifest: { descriptor: descriptor.descriptor, filename: value.filename, ...(metadata ? { metadata } : {}) } }
  } catch {
    return { ok: false, code: 'READ_FAILED' }
  }
}

export function applyBadgeArtifactScan(
  descriptor: BadgeArtifactDescriptor,
  event: BadgeArtifactScanEvent,
): { ok: true; descriptor: BadgeArtifactDescriptor } | { ok: false; code: BadgeArtifactStorageErrorCode } {
  const decision = advanceBadgeArtifactScan({ currentState: descriptor.state, event })
  if (!decision.ok) return { ok: false, code: 'SCAN_TRANSITION_INVALID' }
  return { ok: true, descriptor: { ...descriptor, state: decision.decision.state, downloadable: decision.decision.downloadable } }
}

export async function persistBadgeArtifactScan(input: Readonly<{
  descriptor: BadgeArtifactDescriptor
  event: BadgeArtifactScanEvent
  rootDir?: string
}>): Promise<{ ok: true; descriptor: BadgeArtifactDescriptor } | { ok: false; code: BadgeArtifactStorageErrorCode }> {
  const next = applyBadgeArtifactScan(input.descriptor, input.event)
  if (!next.ok) return next
  const manifestPath = manifestPathFor(input.rootDir ?? BADGE_ARTIFACT_ROOT, input.descriptor)
  if (!manifestPath) return { ok: false, code: 'STORAGE_KEY_INVALID' }
  try {
    const current = JSON.parse(await readFile(manifestPath, 'utf8')) as { filename?: unknown; metadata?: unknown }
    if (typeof current.filename !== 'string' || !isSafeFilename(current.filename)) return { ok: false, code: 'READ_FAILED' }
    const metadata = current.metadata === undefined ? undefined : isValidMetadata(current.metadata) ? current.metadata : null
    if (metadata === null) return { ok: false, code: 'READ_FAILED' }
    await writeFile(manifestPath, JSON.stringify({ descriptor: next.descriptor, filename: current.filename, ...(metadata ? { metadata } : {}) }), { flag: 'w' })
    return next
  } catch {
    return { ok: false, code: 'WRITE_FAILED' }
  }
}

export async function readReadyBadgePdfArtifact(input: Readonly<{
  descriptor: BadgeArtifactDescriptor
  rootDir?: string
}>): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; code: BadgeArtifactStorageErrorCode }> {
  if (input.descriptor.state !== 'READY' || !input.descriptor.downloadable) return { ok: false, code: 'NOT_READY' }
  const fullPath = resolveArtifactPath(input.rootDir ?? BADGE_ARTIFACT_ROOT, input.descriptor.storageKey)
  if (!fullPath || !input.descriptor.storageKey.startsWith(`badge/${input.descriptor.workspaceId}/${input.descriptor.formId}/`)) {
    return { ok: false, code: 'STORAGE_KEY_INVALID' }
  }
  try {
    const bytes = new Uint8Array(await readFile(fullPath))
    if (bytes.byteLength !== input.descriptor.sizeBytes || sha256(bytes) !== input.descriptor.sha256) return { ok: false, code: 'CHECKSUM_MISMATCH' }
    return { ok: true, bytes }
  } catch {
    return { ok: false, code: 'READ_FAILED' }
  }
}
