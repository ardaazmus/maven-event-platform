import { NextRequest, NextResponse } from 'next/server'
import { authorizeInternalWorkerSecret } from '@/lib/internal-worker-auth'
import { readBadgeArtifactManifest, persistBadgeArtifactScan } from '@/lib/badge-artifact-storage'

const BADGE_SCAN_SECRET = 'MAVENFORMS_BADGE_SCAN_WORKER_SECRET'

function isSafeIdentifier(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/u.test(value)
}

export async function POST(req: NextRequest) {
  const expectedSecret = process.env[BADGE_SCAN_SECRET]
  if (!expectedSecret) return NextResponse.json({ error: 'worker_unavailable' }, { status: 503 })
  if (!authorizeInternalWorkerSecret(expectedSecret, req.headers.get('x-mavenforms-worker-secret'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const workspaceId = body?.workspaceId
  const formId = body?.formId
  const artifactId = body?.artifactId
  const event = body?.event
  if (!isSafeIdentifier(workspaceId) || !isSafeIdentifier(formId) || !isSafeIdentifier(artifactId) || (event !== 'SCAN_PASSED' && event !== 'SCAN_FAILED')) {
    return NextResponse.json({ error: 'invalid_scan_request' }, { status: 400 })
  }

  const manifest = await readBadgeArtifactManifest({ scope: { workspaceId, formId, artifactId } })
  if (!manifest.ok) return NextResponse.json({ error: 'artifact_unavailable' }, { status: manifest.code === 'READ_FAILED' ? 404 : 409 })
  const updated = await persistBadgeArtifactScan({ descriptor: manifest.manifest.descriptor, event })
  if (!updated.ok) return NextResponse.json({ error: 'scan_transition_rejected' }, { status: 409 })

  return NextResponse.json({ data: { artifactId, state: updated.descriptor.state, downloadable: updated.descriptor.downloadable } })
}
