import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { db } from '@/lib/db'
import { MEDIA_ROOT, isPublicMediaPath } from '@/lib/media'
import { getPublicMediaTokenAssetId, verifyPublicMediaToken } from '@/lib/public-media-token'

interface RouteParams { params: Promise<{ token: string }> }

// Public branding media is readable only when the signed token matches a clean global asset.
// Form-scoped assets never pass this route, even if their ID is known.
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { token } = await params
  const assetId = getPublicMediaTokenAssetId(token)
  if (!assetId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const asset = await db.mediaAsset.findUnique({ where: { id: assetId } })
  if (!asset || asset.formId !== null || asset.scanStatus !== 'clean' || !verifyPublicMediaToken(token, asset.workspaceId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const mediaRoot = path.resolve(process.cwd(), MEDIA_ROOT)
    const fullPath = path.resolve(process.cwd(), asset.storageKey)
    if (isPublicMediaPath(asset.storageKey) || (fullPath !== mediaRoot && !fullPath.startsWith(`${mediaRoot}${path.sep}`))) {
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
