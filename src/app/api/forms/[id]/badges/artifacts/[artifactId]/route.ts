import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { authorizeBadgeArtifactDelivery } from '@/lib/badge-artifact-delivery-contract'
import { readBadgeArtifactManifest, readReadyBadgePdfArtifact } from '@/lib/badge-artifact-storage'

interface RouteParams {
  params: Promise<{ id: string; artifactId: string }>
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.readSubmissions(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id, artifactId } = await params
  const manifest = await readBadgeArtifactManifest({ scope: { workspaceId: ctx.workspace.id, formId: id, artifactId } })
  if (!manifest.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const delivery = authorizeBadgeArtifactDelivery({
    requester: { authenticated: true, userId: ctx.user.id, workspaceId: ctx.workspace.id, formId: id, canReadBadge: true },
    artifact: manifest.manifest.descriptor,
    nowMs: Date.now(),
  })
  if (!delivery.ok) return NextResponse.json({ error: delivery.code }, { status: delivery.code === 'ARTIFACT_NOT_READY' ? 409 : 403 })

  const artifact = await readReadyBadgePdfArtifact({ descriptor: manifest.manifest.descriptor })
  if (!artifact.ok) return NextResponse.json({ error: artifact.code }, { status: artifact.code === 'NOT_READY' ? 409 : 404 })
  return new NextResponse(Buffer.from(artifact.bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="badge-${artifactId}.pdf"; filename*=UTF-8''${encodeURIComponent(manifest.manifest.filename)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
