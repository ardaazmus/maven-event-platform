import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { sanitizePublicForm } from '@/lib/public-dto'
import { PublicFormRenderer } from '@/components/mavenforms/public-form-renderer'

interface RouteParams {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string }>
}

function sanitizeDraftPreview(form: any) {
  const preview = sanitizePublicForm(form) as any
  const formId = typeof form.id === 'string' ? form.id : null
  const privateMediaUrl = (assetId: unknown) => (
    formId && typeof assetId === 'string' && assetId.length > 0
      ? `/api/media/${encodeURIComponent(assetId)}?formId=${encodeURIComponent(formId)}`
      : null
  )

  if (preview.appearance && form.appearance) {
    preview.appearance.headerLogoUrl = privateMediaUrl(form.appearance.headerLogoMediaId) || preview.appearance.headerLogoUrl
    preview.appearance.headerBgImage = privateMediaUrl(form.appearance.headerBgMediaId) || preview.appearance.headerBgImage
    preview.appearance.footerLogoUrl = privateMediaUrl(form.appearance.footerLogoMediaId) || preview.appearance.footerLogoUrl
  }

  preview.fields = preview.fields.map((field: any, index: number) => {
    const sourceField = form.fields?.[index]
    let sourceConfig: any = sourceField?.configJson
    if (typeof sourceConfig === 'string') {
      try { sourceConfig = JSON.parse(sourceConfig) } catch { sourceConfig = null }
    }
    const assetId = sourceConfig?.decoration?.source === 'media' ? sourceConfig.decoration.mediaAssetId : null
    const mediaUrl = privateMediaUrl(assetId)
    if (!mediaUrl || !field.config?.decoration) return field
    return { ...field, config: { ...field.config, decoration: { ...field.config.decoration, mediaUrl } } }
  })

  return preview
}

export const dynamic = 'force-dynamic'

export default async function PublicFormPage({ params, searchParams }: RouteParams) {
  const { slug } = await params
  const query = await searchParams

  // Preview is an authenticated draft view. It is intentionally separate from
  // the anonymous published snapshot so an editor can verify unsaved-to-live
  // media changes without exposing draft data to public visitors.
  if (query.preview === '1') {
    const ctx = await getSessionFromCookie()
    const auth = ctx ? can.readForms(ctx as any) : { allowed: false }
    if (ctx && auth.allowed) {
      const draft = await db.form.findFirst({
        where: { slug, workspaceId: ctx.workspace.id, deletedAt: null },
        include: {
          fields: { where: { adminOnly: false, hidden: false }, orderBy: { sortOrder: 'asc' } },
          themes: { take: 1 },
          appearance: true,
          paymentConfig: { select: { enabled: true, provider: true, pricingPolicyJson: true } },
        },
      })
      if (draft) return <PublicFormRenderer form={sanitizeDraftPreview(draft)} />
    }
  }

  const formMeta = await db.form.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, status: true, publishedVersionId: true },
  })

  if (!formMeta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form bulunamadı</h1>
          <p className="text-gray-600">Aradığınız form mevcut değil veya kaldırılmış.</p>
        </div>
      </div>
    )
  }

  if (formMeta.status !== 'published' || !formMeta.publishedVersionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form yayında değil</h1>
          <p className="text-gray-600">Bu form şu anda aktif değil.</p>
        </div>
      </div>
    )
  }

  const version = await db.formVersion.findUnique({ where: { id: formMeta.publishedVersionId } })
  if (!version || version.status !== 'published') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form yayında değil</h1>
          <p className="text-gray-600">Bu form şu anda aktif değil.</p>
        </div>
      </div>
    )
  }

  let snapshot: any
  try {
    snapshot = JSON.parse(version.schemaJson)
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form yayında değil</h1>
          <p className="text-gray-600">Sürüm verisi bozuk.</p>
        </div>
      </div>
    )
  }

  // snapshot already sanitized, no internal id leaked — use slug for submission (AC-PUBLIC-05)
  return <PublicFormRenderer form={snapshot} />
}
