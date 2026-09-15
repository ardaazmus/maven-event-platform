// M03.1 storage contract — local MEDIA_ROOT, cloud object storage adapter when multi-instance
import path from 'node:path'

export const MEDIA_ROOT = process.env.MEDIA_ROOT || 'storage/media'

export const MEDIA_ASSET_PURPOSES = Object.freeze([
  'form_media',
  'invoice_document',
  'badge_template',
  'certificate',
] as const)

export type MediaAssetPurpose = (typeof MEDIA_ASSET_PURPOSES)[number]

export const MEDIA_ASSET_STATES = Object.freeze([
  'quarantine',
  'clean',
  'ready',
  'rejected',
  'archived',
] as const)

export type MediaAssetState = (typeof MEDIA_ASSET_STATES)[number]

export const MEDIA_UPLOAD_PURPOSES = Object.freeze([
  'form_media',
  'workspace_settings',
] as const)

export type MediaUploadPurpose = (typeof MEDIA_UPLOAD_PURPOSES)[number]

export type MediaUploadScope = Readonly<{
  workspaceId: string
  formId: string | null
  purpose: MediaUploadPurpose
}>

/** Resolves upload scope from server-owned route context, never client paths. */
export function normalizeMediaUploadScope(input: unknown): MediaUploadScope | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null
  const value = input as Record<string, unknown>
  if (typeof value.workspaceId !== 'string' || value.workspaceId.trim().length === 0) return null
  if (value.formId !== null && (typeof value.formId !== 'string' || value.formId.trim().length === 0)) return null
  if (value.formId === null && value.purpose !== 'workspace_settings') return null
  if (value.formId !== null && value.purpose !== 'form_media') return null
  return Object.freeze({
    workspaceId: value.workspaceId.trim(),
    formId: value.formId === null ? null : (value.formId as string).trim(),
    purpose: value.purpose as MediaUploadPurpose,
  })
}

const MEDIA_STATE_TRANSITIONS: Readonly<Record<MediaAssetState, readonly MediaAssetState[]>> = Object.freeze({
  quarantine: ['clean', 'rejected'],
  clean: ['ready', 'archived'],
  ready: ['archived'],
  rejected: ['quarantine'],
  archived: [],
})

export function canTransitionMediaAssetState(
  from: MediaAssetState,
  to: MediaAssetState,
): boolean {
  return MEDIA_STATE_TRANSITIONS[from]?.includes(to) ?? false
}

export function mediaStoragePath(workspaceId: string, formId: string | null, assetId: string, variant: string = 'original') {
  const scope = formId ? `forms/${formId}` : 'global'
  return path.join(MEDIA_ROOT, 'workspaces', workspaceId, scope, assetId, variant).split(path.sep).join('/')
}

export function isPublicMediaPath(p: string) {
  return p.startsWith('public/')
}

// M03.3 scope service — form A cannot read form B asset, global only via explicit mode
import { db } from '@/lib/db'

export async function listWorkspaceMedia(ctx: { workspace: { id: string } }, formId: string | null, mode: 'form' | 'global' | 'all' = 'form') {
  if (!ctx?.workspace?.id) throw Object.assign(new Error('Unauthorized'), { status: 401 })
  const where: any = { workspaceId: ctx.workspace.id }
  if (mode === 'form') where.formId = formId
  else if (mode === 'global') where.formId = null
  else if (mode === 'all' && formId) where.OR = [{ formId }, { formId: null }]
  const assets = await db.mediaAsset.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 })
  return assets.map(a => ({ id: a.id, originalName: a.originalName, mime: a.mime, size: a.size, width: a.width, height: a.height, altText: a.altText, scanStatus: a.scanStatus, visibility: a.visibility, createdAt: a.createdAt }))
}

export async function assertMediaReadable(ctx: { workspace: { id: string } }, assetId: string, formId: string | null) {
  const asset = await db.mediaAsset.findUnique({ where: { id: assetId } })
  if (!asset || asset.workspaceId !== ctx.workspace.id) throw Object.assign(new Error('Not found'), { status: 404 })
  // form-scoped asset only readable within same form; global readable via explicit global mode
  if (asset.formId && asset.formId !== formId) throw Object.assign(new Error('Not found'), { status: 404 })
  if (asset.scanStatus !== 'clean' && asset.visibility === 'published') throw Object.assign(new Error('Not found'), { status: 404 })
  return asset
}

export async function assertMediaWritable(ctx: { workspace: { id: string } }, formId: string | null) {
  if (!ctx?.workspace?.id) throw Object.assign(new Error('Unauthorized'), { status: 401 })
  // verify form belongs to workspace if formId given
  if (formId) {
    const form = await db.form.findFirst({ where: { id: formId, workspaceId: ctx.workspace.id } })
    if (!form) throw Object.assign(new Error('Not found'), { status: 404 })
  }
  return true
}

export async function attachMediaToForm(assetId: string, formId: string) {
  return db.mediaAsset.update({ where: { id: assetId }, data: { formId } })
}

export async function detachMediaFromForm(assetId: string) {
  return db.mediaAsset.update({ where: { id: assetId }, data: { formId: null } })
}
