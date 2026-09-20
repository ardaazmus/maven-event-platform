import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
// @ts-expect-error Node strip-types tests require explicit TypeScript extensions.
import { createBadgeTemplateStorageKey } from './badge-template-contract.ts'
import type { BadgeTemplateFormat } from './badge-template-contract.ts'

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/u
const MAX_TEMPLATES = 50
const STORED_FORMATS: readonly BadgeTemplateFormat[] = ['pdf', 'png', 'jpeg', 'webp']

export type BadgeTemplateCatalogItem = Readonly<{
  templateId: string
  versionId: string
  workspaceId: string
  formId: string
  originalName: string
  format: BadgeTemplateFormat
  pageCount: 1 | 2
  widthPt: number
  heightPt: number
  visibility: 'private'
  validationStatus: 'VALIDATED'
}>

function isSafeId(value: string) {
  return SAFE_ID.test(value)
}

function catalogRoot(rootDir: string, workspaceId: string, formId: string) {
  const root = path.resolve(rootDir)
  const full = path.resolve(root, 'private', 'workspaces', workspaceId, 'forms', formId, 'badge-templates')
  return full === root || full.startsWith(`${root}${path.sep}`) ? full : null
}

async function readCatalogItem(rootDir: string, workspaceId: string, formId: string, templateId: string, versionId: string) {
  const root = path.resolve(rootDir)
  for (const format of STORED_FORMATS) {
    const storageKey = createBadgeTemplateStorageKey({ workspaceId, formId, templateId, versionId }, format)
    const manifestPath = path.resolve(root, `${storageKey}.json`)
    if (!manifestPath.startsWith(`${root}${path.sep}`)) return null
    try {
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Partial<BadgeTemplateCatalogItem> & { storageKey?: unknown; format?: unknown }
      const manifestFormat = manifest.format ?? (format === 'pdf' ? 'pdf' : null)
      if (
        manifest.templateId !== templateId || manifest.versionId !== versionId || manifest.workspaceId !== workspaceId || manifest.formId !== formId ||
        manifest.visibility !== 'private' || manifest.validationStatus !== 'VALIDATED' || manifest.storageKey !== storageKey ||
        manifestFormat !== format ||
        (manifest.pageCount !== 1 && manifest.pageCount !== 2) || typeof manifest.originalName !== 'string' ||
        !Number.isFinite(manifest.widthPt) || !Number.isFinite(manifest.heightPt)
      ) continue
      return { ...manifest, format } as BadgeTemplateCatalogItem
    } catch {
      continue
    }
  }
  return null
}

export async function listBadgeTemplates(input: Readonly<{ workspaceId: string; formId: string; rootDir: string }>) {
  if (!isSafeId(input.workspaceId) || !isSafeId(input.formId)) return { ok: false as const, code: 'SCOPE_INVALID' as const }
  const root = catalogRoot(input.rootDir, input.workspaceId, input.formId)
  if (!root) return { ok: false as const, code: 'STORAGE_PATH_INVALID' as const }
  const templates: BadgeTemplateCatalogItem[] = []
  try {
    const templateEntries = await readdir(root, { withFileTypes: true })
    for (const templateEntry of templateEntries) {
      if (templates.length >= MAX_TEMPLATES || !templateEntry.isDirectory() || !isSafeId(templateEntry.name)) continue
      const versionsRoot = path.join(root, templateEntry.name)
      const versionEntries = await readdir(versionsRoot, { withFileTypes: true })
      for (const versionEntry of versionEntries) {
        if (templates.length >= MAX_TEMPLATES || !versionEntry.isDirectory() || !isSafeId(versionEntry.name)) continue
        const item = await readCatalogItem(input.rootDir, input.workspaceId, input.formId, templateEntry.name, versionEntry.name)
        if (item) templates.push(item)
      }
    }
  } catch {
    return { ok: true as const, templates: [] }
  }
  templates.sort((left, right) => right.versionId.localeCompare(left.versionId))
  return { ok: true as const, templates }
}

export async function findBadgeTemplate(input: Readonly<{ workspaceId: string; formId: string; templateId: string; versionId: string; rootDir: string }>) {
  if (![input.workspaceId, input.formId, input.templateId, input.versionId].every(isSafeId)) return null
  return readCatalogItem(input.rootDir, input.workspaceId, input.formId, input.templateId, input.versionId)
}
