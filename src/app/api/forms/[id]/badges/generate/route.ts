import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'node:crypto'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { db } from '@/lib/db'
import { BADGE_TEMPLATE_ROOT, readBadgeTemplate } from '@/lib/badge-template-storage'
import { findBadgeTemplate } from '@/lib/badge-template-catalog'
import { validateBadgeGenerationRequest } from '@/lib/badge-generation-request'
import { createBadgeEntry } from '@/lib/badge-entry-contract'
import { createBadgeGenerationJob } from '@/lib/badge-generation-job-contract'
import { createBadgeSubmissionSnapshot } from '@/lib/badge-snapshot-contract'
import { createBadgePersonFieldMapping, projectBadgeFields } from '@/lib/badge-field-mapping'
import { executeBadgeGeneration } from '@/lib/badge-generation-execution'
import { buildBadgePdfFilename } from '@/lib/badge-contract'

interface RouteParams { params: Promise<{ id: string }> }

function safeId(prefix: string) {
  return `${prefix}-${randomBytes(9).toString('hex')}`
}

function parseSettings(value: string) {
  try {
    const parsed = JSON.parse(value || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function textValue(valueJson: string) {
  try {
    const parsed = JSON.parse(valueJson) as { value?: unknown } | unknown
    const value = parsed && typeof parsed === 'object' && 'value' in parsed ? parsed.value : parsed
    return typeof value === 'string' ? value : undefined
  } catch {
    return undefined
  }
}

function defaultMapping(fields: ReadonlyArray<{ fieldKey: string; type: string; hidden: boolean; adminOnly: boolean; encrypted: boolean }>) {
  const keys = (candidates: string[]) => fields.find(field => candidates.includes(field.fieldKey.toLowerCase()))?.fieldKey
  return createBadgePersonFieldMapping(fields, {
    firstName: keys(['first_name', 'firstname', 'name', 'full_name', 'ad_soyad']),
    lastName: keys(['last_name', 'lastname', 'surname', 'soyad']),
    title: keys(['title', 'job_title', 'unvan', 'ünvan']),
    company: keys(['company', 'company_name', 'organization', 'firma', 'kurum']),
  })
}

function facePlan(widthPt: number, heightPt: number, dual: boolean, values: Record<string, string>) {
  const safeArea = { xPt: 12, yPt: 12, widthPt: widthPt - 24, heightPt: heightPt - 24 }
  const front = {
    backgroundAssetId: 'private-pdf-template', pageWidthPt: widthPt, pageHeightPt: heightPt, safeArea,
    textPlacements: [
      { key: 'firstName' as const, box: { xPt: 24, yPt: heightPt - 105, widthPt: widthPt - 48, heightPt: 36 }, maxChars: 160, maxLines: 1 },
      { key: 'lastName' as const, box: { xPt: 24, yPt: heightPt - 149, widthPt: widthPt - 48, heightPt: 36 }, maxChars: 160, maxLines: 1 },
      { key: 'title' as const, box: { xPt: 24, yPt: heightPt - 193, widthPt: widthPt - 48, heightPt: 32 }, maxChars: 160, maxLines: 1 },
      { key: 'company' as const, box: { xPt: 24, yPt: heightPt - 233, widthPt: widthPt - 48, heightPt: 30 }, maxChars: 160, maxLines: 1 },
      { key: 'eventName' as const, box: { xPt: 24, yPt: 24, widthPt: widthPt - 145, heightPt: 24 }, maxChars: 160, maxLines: 1 },
      { key: 'eventDate' as const, box: { xPt: 24, yPt: 48, widthPt: widthPt - 145, heightPt: 20 }, maxChars: 80, maxLines: 1 },
    ],
    values,
    qrPlacement: { box: { xPt: widthPt - 108, yPt: 24, widthPt: 84, heightPt: 84 }, vector: true, quietZoneModules: 4 },
  }
  if (!dual) return [front]
  return [front, { ...front, textPlacements: [], qrPlacement: undefined }]
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.writeForms(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id: formId } = await params
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const request = validateBadgeGenerationRequest({
    templateId: typeof body?.templateId === 'string' ? body.templateId : '',
    templateVersionId: typeof body?.templateVersionId === 'string' ? body.templateVersionId : '',
    selectionMode: body?.selectionMode === 'ALL' || body?.selectionMode === 'SELECTED' || body?.selectionMode === 'SINGLE' ? body.selectionMode : 'SELECTED',
    submissionIds: Array.isArray(body?.submissionIds) ? body.submissionIds.filter((id): id is string => typeof id === 'string') : [],
    ...(body?.faceMode === 'SINGLE_FACE' || body?.faceMode === 'DUAL_FACE' ? { faceMode: body.faceMode } : {}),
  })
  if (!request.ok) return NextResponse.json({ error: 'Yaka kartı üretim isteği geçersiz', code: request.code }, { status: 400 })

  const form = await db.form.findFirst({ where: { id: formId, workspaceId: ctx.workspace.id, deletedAt: null }, include: { fields: true } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })
  if (form.status !== 'published' || !form.publishedVersionId) return NextResponse.json({ error: 'Yalnız yayınlanmış ve sürümü bulunan formdan üretim yapılabilir' }, { status: 409 })
  const template = await findBadgeTemplate({ workspaceId: ctx.workspace.id, formId: form.id, templateId: request.request.templateId, versionId: request.request.templateVersionId, rootDir: BADGE_TEMPLATE_ROOT })
  if (!template) return NextResponse.json({ error: 'Seçilen private şablon bu forma ait değil' }, { status: 404 })
  if (template.format !== 'pdf') return NextResponse.json({ error: 'Raster şablon üretimi henüz kapalı', code: 'RENDER_FORMAT_UNSUPPORTED' }, { status: 409 })
  const faceMode = request.request.faceMode ?? (template.pageCount === 2 ? 'DUAL_FACE' : 'SINGLE_FACE')
  if ((faceMode === 'DUAL_FACE' ? 2 : 1) !== template.pageCount) return NextResponse.json({ error: 'Yüz modu şablon sayfa sayısıyla eşleşmiyor', code: 'PAGE_COUNT_MISMATCH' }, { status: 400 })
  const storedTemplate = await readBadgeTemplate({ scope: { workspaceId: ctx.workspace.id, formId: form.id, templateId: template.templateId, versionId: template.versionId }, rootDir: BADGE_TEMPLATE_ROOT })
  if (!storedTemplate.ok) return NextResponse.json({ error: 'Şablon okunamadı', code: storedTemplate.code }, { status: 500 })

  const eligibleWhere = { formId: form.id, status: { notIn: ['spam', 'archived'] } }
  const eligible = request.request.selectionMode === 'ALL'
    ? await db.submission.findMany({ where: eligibleWhere, orderBy: { submittedAt: 'asc' }, take: 501, include: { values: { include: { field: true } } } })
    : await db.submission.findMany({ where: { ...eligibleWhere, id: { in: [...request.request.submissionIds] } }, include: { values: { include: { field: true } } } })
  if (request.request.selectionMode === 'ALL' && eligible.length > 500) return NextResponse.json({ error: 'Toplu üretim tek işlemde en fazla 500 uygun kayıt alır', code: 'SELECTION_TOO_LARGE' }, { status: 413 })
  const eligibleIds = eligible.map(item => item.id)
  if (!eligibleIds.length || (request.request.selectionMode !== 'ALL' && eligibleIds.length !== request.request.submissionIds.length)) return NextResponse.json({ error: 'Seçilen kayıtların tamamı bu forma ait ve uygun değil', code: 'SELECTION_OUTSIDE_ELIGIBLE' }, { status: 400 })
  const entry = createBadgeEntry({ surface: 'FORM_DETAIL', selectionMode: request.request.selectionMode, workspaceId: ctx.workspace.id, formId: form.id, formStatus: 'PUBLISHED', authenticated: true, userId: ctx.user.id, canReadBadge: true, selectedSubmissionIds: request.request.submissionIds, eligibleSubmissionIds: eligibleIds })
  if (!entry.ok) return NextResponse.json({ error: 'Yaka kartı seçimi geçersiz', code: entry.code }, { status: 400 })

  const settings = parseSettings(form.settingsJson)
  const badgeSettings = settings.badge && typeof settings.badge === 'object' && !Array.isArray(settings.badge) ? settings.badge as Record<string, unknown> : {}
  const requestedMapping = badgeSettings.mapping && typeof badgeSettings.mapping === 'object' && !Array.isArray(badgeSettings.mapping) ? badgeSettings.mapping as Record<string, string> : defaultMapping(form.fields)
  const mapping = createBadgePersonFieldMapping(form.fields, requestedMapping)
  const jobId = safeId('job')
  const snapshotHash = createHash('sha256').update(`${form.id}:${form.publishedVersionId}:${eligibleIds.join(',')}`).digest('hex').slice(0, 32)
  const job = createBadgeGenerationJob({ entry: entry.entry, jobId, templateVersionId: template.versionId, snapshotHash, printProfileId: `profile-${faceMode.toLowerCase()}`, faceMode })
  if (!job.ok) return NextResponse.json({ error: 'Yaka kartı işi oluşturulamadı', code: job.code }, { status: 400 })
  const results: Array<{ submissionId: string; artifactId?: string; outputId?: string; state?: 'QUARANTINED'; errorCode?: string }> = []
  for (const submission of eligible) {
    const answers: Record<string, string> = {}
    for (const value of submission.values) {
      const text = textValue(value.valueJson)
      if (text) answers[value.field.fieldKey] = text
    }
    const projection = projectBadgeFields({ answers, mapping, context: { eventName: form.title, eventDate: (form.startDate ?? form.endDate)?.toISOString() ?? undefined } })
    const snapshot = createBadgeSubmissionSnapshot({ snapshotId: safeId('snapshot'), workspaceId: ctx.workspace.id, formId: form.id, submissionId: submission.id, formVersionId: form.publishedVersionId, capturedAtMs: Date.now(), values: projection })
    if (!snapshot.ok) { results.push({ submissionId: submission.id, errorCode: snapshot.code }); continue }
    const badgeInstanceId = safeId('instance')
    const artifactId = safeId('artifact')
    const outputId = safeId('output')
    const values = snapshot.snapshot.values
    const faces = facePlan(template.widthPt, template.heightPt, faceMode === 'DUAL_FACE', values)
    const execution = await executeBadgeGeneration({
      job: job.job,
      template: { templateId: template.templateId, versionId: template.versionId, workspaceId: ctx.workspace.id, formId: form.id, pageCount: template.pageCount, visibility: 'private', validationStatus: 'VALIDATED' },
      snapshot: snapshot.snapshot,
      badgeInstanceId,
      artifactId,
      outputId,
      backgroundPdfBytes: storedTemplate.bytes,
      faces,
      qrCredential: { mode: 'SECURE_TOKEN', payload: randomBytes(18).toString('base64url'), workspaceId: ctx.workspace.id, formId: form.id, badgeInstanceId, revoked: false },
      filename: buildBadgePdfFilename({ firstName: values.firstName ?? 'katilimci', lastName: values.lastName ?? 'kart', title: values.title, eventName: form.title, formName: form.title, outputIdShort: outputId.slice(-10) }),
    })
    if (!execution.ok) { results.push({ submissionId: submission.id, errorCode: execution.code }); continue }
    results.push({ submissionId: submission.id, artifactId, outputId, state: 'QUARANTINED' })
  }
  return NextResponse.json({ data: { jobId, selectionMode: request.request.selectionMode, createdCount: results.filter(item => item.state === 'QUARANTINED').length, results, scanRequired: true, downloadable: false } }, { status: 202 })
}
