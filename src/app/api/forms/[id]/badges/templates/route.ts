import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { PDFDocument } from 'pdf-lib'
import sharp from 'sharp'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { storeBadgeTemplate } from '@/lib/badge-template-storage'
import { validateBadgeTemplateUpload } from '@/lib/badge-template-contract'
import { db } from '@/lib/db'

interface RouteParams { params: Promise<{ id: string }> }
const MAX_TEMPLATE_BYTES = 25 * 1024 * 1024
const RASTER_MIMES = ['image/png', 'image/jpeg', 'image/webp']
const RASTER_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp']
const SHARP_FORMATS: Record<string, string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.writeForms(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id: formId } = await params
  const form = await db.form.findFirst({ where: { id: formId, workspaceId: ctx.workspace.id, deletedAt: null }, select: { id: true } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })
  const formData = await req.formData().catch(() => null)
  const file = formData?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Şablon dosyası gerekli' }, { status: 400 })
  if (file.size < 1 || file.size > MAX_TEMPLATE_BYTES) return NextResponse.json({ error: 'Şablon boyutu geçersiz' }, { status: 413 })
  const mime = (file.type || '').toLowerCase()
  const lowerName = file.name.toLowerCase()
  const extension = lowerName.includes('.') ? lowerName.slice(lowerName.lastIndexOf('.')) : ''
  const wantsPdf = mime === 'application/pdf' || extension === '.pdf'
  const wantsRaster = RASTER_MIMES.includes(mime) || RASTER_EXTENSIONS.includes(extension)
  if (!wantsPdf && !wantsRaster) return NextResponse.json({ error: 'Desteklenmeyen şablon formatı', code: 'FORMAT_REQUIRED' }, { status: 415 })
  if (wantsPdf && wantsRaster) return NextResponse.json({ error: 'Şablon MIME ve uzantısı uyuşmuyor', code: 'FORMAT_MISMATCH' }, { status: 415 })
  const bytes = new Uint8Array(await file.arrayBuffer())
  let pageCount: number
  let dimensions: { widthPt: number; heightPt: number }
  if (wantsPdf) {
    if (mime !== 'application/pdf' || extension !== '.pdf') {
      return NextResponse.json({ error: 'Şablon MIME ve uzantısı uyuşmuyor', code: 'FORMAT_MISMATCH' }, { status: 415 })
    }
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false }).catch(() => null)
    if (!pdf) return NextResponse.json({ error: 'Geçersiz PDF' }, { status: 415 })
    pageCount = pdf.getPageCount()
    const firstPage = pdf.getPage(0)
    dimensions = { widthPt: firstPage.getWidth(), heightPt: firstPage.getHeight() }
  } else {
    if (!RASTER_MIMES.includes(mime) || !RASTER_EXTENSIONS.includes(extension)) {
      return NextResponse.json({ error: 'Şablon MIME ve uzantısı uyuşmuyor', code: 'FORMAT_MISMATCH' }, { status: 415 })
    }
    const metadata = await sharp(Buffer.from(bytes)).metadata().catch(() => null)
    if (!metadata?.width || !metadata.height) return NextResponse.json({ error: 'Geçersiz görüntü' }, { status: 415 })
    if (SHARP_FORMATS[metadata.format ?? ''] !== mime) {
      return NextResponse.json({ error: 'Görüntü içeriği MIME ile eşleşmiyor', code: 'FORMAT_MISMATCH' }, { status: 415 })
    }
    pageCount = 1
    dimensions = { widthPt: metadata.width, heightPt: metadata.height }
  }
  const validation = validateBadgeTemplateUpload({ workspaceId: ctx.workspace.id, formId, originalName: file.name, mime, size: bytes.byteLength, bytes, pageCount, ...dimensions, visibility: 'private' })
  if (!validation.ok) return NextResponse.json({ error: 'Şablon doğrulamadan geçmedi', code: validation.code }, { status: 415 })
  const templateId = `template-${randomBytes(8).toString('hex')}`
  const versionId = `version-${randomBytes(8).toString('hex')}`
  const stored = await storeBadgeTemplate({ scope: { workspaceId: ctx.workspace.id, formId, templateId, versionId }, originalName: file.name, mime, bytes, pageCount: pageCount as 1 | 2, ...dimensions })
  if (!stored.ok) return NextResponse.json({ error: 'Şablon kaydedilemedi', code: stored.code }, { status: stored.code === 'WRITE_CONFLICT' ? 409 : 500 })
  return NextResponse.json({ data: { templateId, versionId, format: stored.manifest.format, pageCount: stored.manifest.pageCount, widthPt: stored.manifest.widthPt, heightPt: stored.manifest.heightPt, visibility: 'private', validationStatus: 'VALIDATED' } }, { status: 201 })
}
