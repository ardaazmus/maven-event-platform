import { NextRequest, NextResponse } from 'next/server'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { BADGE_ARTIFACT_ROOT, readBadgeArtifactManifest } from '@/lib/badge-artifact-storage'

interface RouteParams { params: Promise<{ id: string }> }
const MAX_ARTIFACTS = 200

function isSafeIdentifier(value: string) {
  return /^[A-Za-z0-9_-]{1,128}$/u.test(value)
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.readSubmissions(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id } = await params
  if (!isSafeIdentifier(id) || !isSafeIdentifier(ctx.workspace.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const scopeRoot = path.resolve(BADGE_ARTIFACT_ROOT, 'badge', ctx.workspace.id, id)
  let artifactDirectories
  try {
    artifactDirectories = await readdir(scopeRoot, { withFileTypes: true })
  } catch {
    return NextResponse.json({ data: { artifacts: [] } })
  }

  const artifacts: Array<{
    artifactId: string
    outputId: string
    state: 'QUARANTINED' | 'READY' | 'BLOCKED'
    downloadable: boolean
    sizeBytes: number
    downloadUrl?: string
  }> = []
  for (const entry of artifactDirectories.slice(0, MAX_ARTIFACTS)) {
    if (!entry.isDirectory() || !isSafeIdentifier(entry.name)) continue
    const manifest = await readBadgeArtifactManifest({ scope: { workspaceId: ctx.workspace.id, formId: id, artifactId: entry.name } })
    if (!manifest.ok) continue
    const { descriptor } = manifest.manifest
    artifacts.push({
      artifactId: descriptor.artifactId,
      outputId: descriptor.outputId,
      state: descriptor.state,
      downloadable: descriptor.downloadable,
      sizeBytes: descriptor.sizeBytes,
      ...(descriptor.downloadable ? { downloadUrl: `/api/forms/${encodeURIComponent(id)}/badges/artifacts/${encodeURIComponent(descriptor.artifactId)}` } : {}),
    })
  }

  artifacts.sort((left, right) => left.artifactId.localeCompare(right.artifactId))
  return NextResponse.json({ data: { artifacts } })
}
