import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { listWorkspaceMedia, mediaStoragePath, MEDIA_ROOT, normalizeMediaUploadScope } from '@/lib/media'
import { validateFile } from '@/lib/file-policy'
import { checkRateLimit, checkQuota } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { randomBytes, createHash } from 'crypto'
import { writeFile, mkdir, unlink } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

interface RouteParams { params: Promise<{ id: string }> }

// GET /api/forms/:id/media?scope=form  — form scoped, DTO no storageKey
export async function GET(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.readForms(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const scope = (searchParams.get('scope') as 'form'|'global' | null) || 'form'
  if (scope === 'global') {
    return NextResponse.json({ error: 'Form medya alanı yalnızca bu forma ait medyayı kullanabilir' }, { status: 403 })
  }
  if (scope !== 'form') return NextResponse.json({ error: 'Geçersiz medya kapsamı' }, { status: 400 })
  const assets = await listWorkspaceMedia(ctx as any, id, scope as any)
  return NextResponse.json({ data: assets })
}

// POST /api/forms/:id/media — multipart, private original, scan pending (M04.2)
export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.writeForms(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id } = await params
  // Tenant check is required even for global workspace media.
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (req.headers.get('content-type')?.includes('application/json')) {
    const body = await req.json().catch(() => null)
    if (body?.action !== 'attach' || typeof body.assetId !== 'string') {
      return NextResponse.json({ error: 'Geçersiz medya işlemi' }, { status: 400 })
    }
    const asset = await db.mediaAsset.findFirst({ where: { id: body.assetId, workspaceId: ctx.workspace.id } })
    if (!asset) return NextResponse.json({ error: 'Medya bulunamadı' }, { status: 404 })
    if (asset.formId && asset.formId !== id) return NextResponse.json({ error: 'Medya bu forma ait değil' }, { status: 403 })
    if (asset.scanStatus !== 'clean' || asset.visibility !== 'private') return NextResponse.json({ error: 'Medya henüz kullanıma hazır değil' }, { status: 409 })
    const attached = await db.mediaAsset.update({ where: { id: asset.id }, data: { formId: id } })
    return NextResponse.json({ data: { id: attached.id, originalName: attached.originalName, mime: attached.mime, size: attached.size, width: attached.width, height: attached.height, altText: attached.altText, scanStatus: attached.scanStatus } })
  }

  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope') || 'form'
  if (scope === 'global') return NextResponse.json({ error: 'Form medya yüklemesi yalnızca bu forma yapılabilir' }, { status: 403 })
  if (scope !== 'form') return NextResponse.json({ error: 'Geçersiz medya kapsamı' }, { status: 400 })
  const uploadScope = normalizeMediaUploadScope({ workspaceId: ctx.workspace.id, formId: id, purpose: 'form_media' })
  if (!uploadScope) return NextResponse.json({ error: 'Geçersiz upload kapsamı' }, { status: 500 })
  const targetFormId = uploadScope.formId as string

  // Anti-abuse: rate limit 20/min per workspace+form, quota 100 per form, 1000 per workspace
  const rl = checkRateLimit(`upload:${ctx.workspace.id}:${id}`, 20, 60_000)
  if (!rl.allowed) return NextResponse.json({ error: 'Çok fazla yükleme, sonra tekrar deneyin' }, { status: 429 })
  const formCount = await db.mediaAsset.count({ where: { formId: targetFormId } })
  if (!checkQuota(formCount, 100)) return NextResponse.json({ error: 'Form medya kotası doldu' }, { status: 409 })
  const wsCount = await db.mediaAsset.count({ where: { workspaceId: ctx.workspace.id } })
  if (!checkQuota(wsCount, 1000)) return NextResponse.json({ error: 'Workspace kotası doldu' }, { status: 409 })

  let formData: FormData
  try { formData = await req.formData() } catch { return NextResponse.json({ error: 'Invalid multipart' }, { status: 400 }) }
  const file = formData.get('file') as File | null
  const altText = (formData.get('altText') as string) || null
  if (!file) return NextResponse.json({ error: 'file gerekli' }, { status: 400 })

  const v = validateFile(file.name, file.size, file.type)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: file.size > 5*1024*1024 ? 413 : 415 })

  // Media assets are images. Documents belong to a separate file-field pipeline.
  const buf = Buffer.from(await file.arrayBuffer())
  const magic = buf.slice(0,4).toString('hex')
  const isPng = magic.startsWith('89504e47')
  const isJpeg = magic.startsWith('ffd8ff')
  const isWebp = buf.slice(8,12).toString() === 'WEBP'
  if (!isPng && !isJpeg && !isWebp) return NextResponse.json({ error: 'Sadece PNG, JPEG veya WebP görseller yüklenebilir' }, { status: 415 })
  const detectedMime = isPng ? 'image/png' : isJpeg ? 'image/jpeg' : 'image/webp'
  if (file.type && file.type !== detectedMime) return NextResponse.json({ error: 'Dosya MIME tipi içeriğiyle eşleşmiyor' }, { status: 415 })
  const metadata = await sharp(buf).metadata().catch(() => null)
  if (!metadata?.width || !metadata.height || metadata.width > 10000 || metadata.height > 10000) {
    return NextResponse.json({ error: 'Geçersiz veya çok büyük görsel boyutu' }, { status: 415 })
  }

  // Checksum + storageKey
  const checksum = createHash('sha256').update(buf).digest('hex')
  const assetId = randomBytes(8).toString('hex')
  const storageKey = mediaStoragePath(uploadScope.workspaceId, uploadScope.formId, assetId, 'original')
  const mediaRoot = path.resolve(process.cwd(), MEDIA_ROOT)
  const fullPath = path.resolve(process.cwd(), storageKey)
  if (fullPath !== mediaRoot && !fullPath.startsWith(`${mediaRoot}${path.sep}`)) {
    return NextResponse.json({ error: 'Güvenli olmayan medya yolu' }, { status: 500 })
  }
  await mkdir(path.dirname(fullPath), { recursive: true })
  await writeFile(fullPath, buf)

  let asset
  try {
    asset = await db.mediaAsset.create({
      data: {
        workspaceId: ctx.workspace.id,
        formId: targetFormId,
        storageKey,
        originalName: file.name,
        mime: detectedMime,
        size: buf.length,
        width: metadata.width,
        height: metadata.height,
        checksum,
        altText: altText?.slice(0, 300) || null,
        // Strict byte/MIME/decoder validation completed; AV/quarantine approval is still required.
        scanStatus: 'pending',
        visibility: 'private',
        createdById: ctx.user.id,
      },
    })
  } catch (error) {
    await unlink(fullPath).catch(() => undefined)
    throw error
  }
  return NextResponse.json({ data: { id: asset.id, originalName: asset.originalName, mime: asset.mime, size: asset.size, width: asset.width, height: asset.height, altText: asset.altText, scanStatus: asset.scanStatus } }, { status: 201 })
}
