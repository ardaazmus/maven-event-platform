import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
// @ts-expect-error Node strip-types tests require explicit TypeScript extensions.
import { createBadgeTemplateStorageKey, validateBadgeTemplateUpload } from './badge-template-contract.ts'

export const BADGE_TEMPLATE_ROOT = process.env.BADGE_TEMPLATE_ROOT || 'storage/badge-templates'

type BadgeTemplateScope = Readonly<{ workspaceId: string; formId: string; templateId: string; versionId: string }>

export type BadgeTemplateManifest = Readonly<{
  templateId: string
  versionId: string
  workspaceId: string
  formId: string
  originalName: string
  pageCount: 1 | 2
  widthPt: number
  heightPt: number
  visibility: 'private'
  validationStatus: 'VALIDATED'
  storageKey: string
}>

function isSafeIdentifier(value: string) {
  return /^[A-Za-z0-9_-]{1,128}$/u.test(value)
}

function resolveStoragePath(rootDir: string, storageKey: string) {
  const root = path.resolve(rootDir)
  const fullPath = path.resolve(root, storageKey)
  return fullPath === root || fullPath.startsWith(`${root}${path.sep}`) ? fullPath : null
}

export async function storeBadgeTemplate(input: Readonly<{
  scope: BadgeTemplateScope
  originalName: string
  bytes: Uint8Array
  pageCount: 1 | 2
  widthPt: number
  heightPt: number
  rootDir?: string
}>): Promise<{ ok: true; manifest: BadgeTemplateManifest } | { ok: false; code: string }> {
  if (![input.scope.workspaceId, input.scope.formId, input.scope.templateId, input.scope.versionId].every(isSafeIdentifier)) return { ok: false, code: 'SCOPE_INVALID' }
  const validation = validateBadgeTemplateUpload({ workspaceId: input.scope.workspaceId, formId: input.scope.formId, originalName: input.originalName, mime: 'application/pdf', size: input.bytes.byteLength, bytes: input.bytes, pageCount: input.pageCount, widthPt: input.widthPt, heightPt: input.heightPt, visibility: 'private' })
  if (!validation.ok) return validation
  const storageKey = createBadgeTemplateStorageKey(input.scope)
  const filePath = resolveStoragePath(input.rootDir ?? BADGE_TEMPLATE_ROOT, storageKey)
  if (!filePath) return { ok: false, code: 'STORAGE_PATH_INVALID' }
  const manifest: BadgeTemplateManifest = { ...input.scope, originalName: input.originalName.slice(0, 255), pageCount: input.pageCount, widthPt: input.widthPt, heightPt: input.heightPt, visibility: 'private', validationStatus: 'VALIDATED', storageKey }
  try {
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, input.bytes, { flag: 'wx' })
    await writeFile(`${filePath}.json`, JSON.stringify(manifest), { flag: 'wx' })
    return { ok: true, manifest }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST') return { ok: false, code: 'WRITE_CONFLICT' }
    return { ok: false, code: 'WRITE_FAILED' }
  }
}

export async function readBadgeTemplate(input: Readonly<{ scope: BadgeTemplateScope; rootDir?: string }>) {
  if (![input.scope.workspaceId, input.scope.formId, input.scope.templateId, input.scope.versionId].every(isSafeIdentifier)) return { ok: false as const, code: 'SCOPE_INVALID' as const }
  const storageKey = createBadgeTemplateStorageKey(input.scope)
  const filePath = resolveStoragePath(input.rootDir ?? BADGE_TEMPLATE_ROOT, storageKey)
  if (!filePath) return { ok: false as const, code: 'STORAGE_PATH_INVALID' as const }
  try {
    const manifest = JSON.parse(await readFile(`${filePath}.json`, 'utf8')) as BadgeTemplateManifest
    if (manifest.storageKey !== storageKey || manifest.visibility !== 'private' || manifest.validationStatus !== 'VALIDATED') return { ok: false as const, code: 'MANIFEST_INVALID' as const }
    return { ok: true as const, manifest, bytes: new Uint8Array(await readFile(filePath)) }
  } catch {
    return { ok: false as const, code: 'NOT_FOUND' as const }
  }
}
