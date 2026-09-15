import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { listWorkspaceMedia, normalizeMediaUploadScope } from '@/lib/media'
import { MEDIA_ROOT, mediaStoragePath } from '@/lib/media'
import { validateFile } from '@/lib/file-policy'
import { checkRateLimit, checkQuota } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { createHash, randomBytes } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

// GET /api/media?scope=form&formId=xxx  or scope=global
export async function GET(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope') as 'form'|'global'|'all' | null
  const formId = searchParams.get('formId')
  const mode = (scope as any) || (formId ? 'form' : 'global')
  const auth = mode === 'form' ? can.readForms(ctx as any) : can.manageSettings(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (scope === 'form' && !formId) return NextResponse.json({ error: 'formId gerekli' }, { status: 400 })
  const assets = await listWorkspaceMedia(ctx as any, formId, mode)
  return NextResponse.json({ data: assets })
}

// POST /api/media?scope=global — workspace settings media only.
// Form-scoped uploads stay behind /api/forms/:id/media so a form cannot write to global media accidentally.
export async function POST(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.manageSettings(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  if (searchParams.get('scope') !== 'global') {
    return NextResponse.json({ error: 'Yalnızca global ayar medyası bu uçtan yüklenebilir' }, { status: 400 })
  }
  const uploadScope = normalizeMediaUploadScope({ workspaceId: ctx.workspace.id, formId: null, purpose: 'workspace_settings' })
  if (!uploadScope) return NextResponse.json({ error: 'Geçersiz upload kapsamı' }, { status: 500 })

  const rate = checkRateLimit(`global-upload:${ctx.workspace.id}`, 20, 60_000)
  if (!rate.allowed) return NextResponse.json({ error: 'Çok fazla yükleme, sonra tekrar deneyin' }, { status: 429 })
  const [globalCount, workspaceCount] = await Promise.all([
    db.mediaAsset.count({ where: { workspaceId: ctx.workspace.id, formId: null } }),
    db.mediaAsset.count({ where: { workspaceId: ctx.workspace.id } }),
  ])
  if (!checkQuota(globalCount, 100)) return NextResponse.json({ error: 'Ortak medya kotası doldu' }, { status: 409 })
  if (!checkQuota(workspaceCount, 1000)) return NextResponse.json({ error: 'Workspace kotası doldu' }, { status: 409 })

  let formData: FormData
  try { formData = await req.formData() } catch { return NextResponse.json({ error: 'Invalid multipart' }, { status: 400 }) }
  const file = formData.get('file') as File | null
  const altText = (formData.get('altText') as string) || null
  if (!file) return NextResponse.json({ error: 'file gerekli' }, { status: 400 })

  const validation = validateFile(file.name, file.size, file.type)
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: file.size > 5 * 1024 * 1024 ? 413 : 415 })
  const buffer = Buffer.from(await file.arrayBuffer())
  const magic = buffer.slice(0, 4).toString('hex')
  const isPng = magic.startsWith('89504e47')
  const isJpeg = magic.startsWith('ffd8ff')
  const isWebp = buffer.slice(8, 12).toString() === 'WEBP'
  if (!isPng && !isJpeg && !isWebp) return NextResponse.json({ error: 'Sadece PNG, JPEG veya WebP görseller yüklenebilir' }, { status: 415 })
  const detectedMime = isPng ? 'image/png' : isJpeg ? 'image/jpeg' : 'image/webp'
  if (file.type && file.type !== detectedMime) return NextResponse.json({ error: 'Dosya MIME tipi içeriğiyle eşleşmiyor' }, { status: 415 })
  const metadata = await sharp(buffer).metadata().catch(() => null)
  if (!metadata?.width || !metadata.height || metadata.width > 10000 || metadata.height > 10000) {
    return NextResponse.json({ error: 'Geçersiz veya çok büyük görsel boyutu' }, { status: 415 })
  }

  const assetId = randomBytes(8).toString('hex')
  const storageKey = mediaStoragePath(uploadScope.workspaceId, uploadScope.formId, assetId, 'original')
  const mediaRoot = path.resolve(process.cwd(), MEDIA_ROOT)
  const fullPath = path.resolve(process.cwd(), storageKey)
  if (fullPath !== mediaRoot && !fullPath.startsWith(`${mediaRoot}${path.sep}`)) {
    return NextResponse.json({ error: 'Güvenli olmayan medya yolu' }, { status: 500 })
  }
  await mkdir(path.dirname(fullPath), { recursive: true })
  await writeFile(fullPath, buffer)

  try {
    const asset = await db.mediaAsset.create({
      data: {
        workspaceId: ctx.workspace.id,
        formId: null,
        storageKey,
        originalName: file.name,
        mime: detectedMime,
        size: buffer.length,
        width: metadata.width,
        height: metadata.height,
        checksum: createHash('sha256').update(buffer).digest('hex'),
        altText: altText?.slice(0, 300) || null,
        scanStatus: 'clean',
        visibility: 'private',
        createdById: ctx.user.id,
      },
    })
    return NextResponse.json({ data: { id: asset.id, originalName: asset.originalName, mime: asset.mime, size: asset.size, altText: asset.altText, scanStatus: asset.scanStatus } }, { status: 201 })
  } catch (error) {
    await unlink(fullPath).catch(() => undefined)
    throw error
  }
}
