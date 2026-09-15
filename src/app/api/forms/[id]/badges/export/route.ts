import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { BADGE_ARTIFACT_ROOT, readBadgeArtifactManifest } from '@/lib/badge-artifact-storage'
import { exportBadgeArtifacts } from '@/lib/badge-export-package'

interface RouteParams { params: Promise<{ id: string }> }

function safeId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/u.test(value)
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.readSubmissions(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id: formId } = await params
  const body = await req.json().catch(() => null) as { artifactIds?: unknown; format?: unknown } | null
  const artifactIds = Array.isArray(body?.artifactIds) ? body.artifactIds.filter(safeId) : []
  if (!artifactIds.length || artifactIds.length > 500 || artifactIds.length !== (Array.isArray(body?.artifactIds) ? body.artifactIds.length : 0)) return NextResponse.json({ error: 'Export için 1-500 güvenli artifact seçin' }, { status: 400 })
  if (body?.format !== 'ZIP' && body?.format !== 'COMBINED_PDF') return NextResponse.json({ error: 'Export formatı geçersiz' }, { status: 400 })

  const manifests = await Promise.all(artifactIds.map(artifactId => readBadgeArtifactManifest({ scope: { workspaceId: ctx.workspace.id, formId, artifactId }, rootDir: BADGE_ARTIFACT_ROOT })))
  if (manifests.some(item => !item.ok || !item.manifest.metadata)) return NextResponse.json({ error: 'Yalnız yeni metadata taşıyan artifact export edilebilir', code: 'EXPORT_METADATA_REQUIRED' }, { status: 409 })
  const first = manifests[0] as Extract<(typeof manifests)[number], { ok: true }>
  const metadata = first.manifest.metadata!
  if (manifests.some(item => {
    const current = item as Extract<(typeof manifests)[number], { ok: true }>
    return current.manifest.metadata!.jobId !== metadata.jobId || current.manifest.metadata!.templateVersionId !== metadata.templateVersionId || current.manifest.metadata!.printProfileId !== metadata.printProfileId || current.manifest.metadata!.faceMode !== metadata.faceMode
  })) return NextResponse.json({ error: 'Farklı generation işleri birlikte export edilemez', code: 'EXPORT_SCOPE_MISMATCH' }, { status: 409 })
  const exported = await exportBadgeArtifacts({ jobId: metadata.jobId, workspaceId: ctx.workspace.id, formId, templateVersionId: metadata.templateVersionId, printProfileId: metadata.printProfileId, faceMode: metadata.faceMode, entries: manifests.map(item => { const manifest = (item as Extract<(typeof manifests)[number], { ok: true }>).manifest; return { submissionId: manifest.metadata!.submissionId, descriptor: manifest.descriptor, filename: manifest.filename, rootDir: BADGE_ARTIFACT_ROOT } }) })
  if (!exported.ok) return NextResponse.json({ error: 'Export hazırlanamadı', code: exported.code, value: exported.value }, { status: exported.code === 'ARTIFACT_NOT_READY' ? 409 : 400 })
  const bytes = body.format === 'ZIP' ? exported.output.zipBytes : exported.output.combinedPdfBytes
  const filename = body.format === 'ZIP' ? exported.output.package.zipName : exported.output.package.combinedPdfName
  return new NextResponse(bytes as BodyInit, { status: 200, headers: { 'Content-Type': body.format === 'ZIP' ? 'application/zip' : 'application/pdf', 'Content-Length': String(bytes.byteLength), 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'private, no-store' } })
}
