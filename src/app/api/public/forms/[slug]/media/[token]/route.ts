import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { db } from '@/lib/db'
import { verifyPublicMediaToken } from '@/lib/public-media-token'
import { MEDIA_ROOT } from '@/lib/media'

interface RouteParams { params: Promise<{ slug: string; token: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { slug, token } = await params
  const assetId = verifyPublicMediaToken(token, slug)
  if (!assetId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const form = await db.form.findFirst({
    where: { slug, status: 'published', deletedAt: null, publishedVersionId: { not: null } },
    select: { id: true, workspaceId: true },
  })
  if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const asset = await db.mediaAsset.findFirst({
    where: { id: assetId, workspaceId: form.workspaceId, formId: form.id, scanStatus: 'clean' },
  })
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const mediaRoot = path.resolve(process.cwd(), MEDIA_ROOT)
    const fullPath = path.resolve(process.cwd(), asset.storageKey)
    if (fullPath !== mediaRoot && !fullPath.startsWith(`${mediaRoot}${path.sep}`)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const buffer = await readFile(fullPath)
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': asset.mime,
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
