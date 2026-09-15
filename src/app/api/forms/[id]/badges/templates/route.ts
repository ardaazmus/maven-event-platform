import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { PDFDocument } from 'pdf-lib'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { storeBadgeTemplate } from '@/lib/badge-template-storage'
import { validateBadgeTemplateUpload } from '@/lib/badge-template-contract'
import { db } from '@/lib/db'

interface RouteParams { params: Promise<{ id: string }> }
const MAX_TEMPLATE_BYTES = 25 * 1024 * 1024

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
  if (!(file instanceof File)) return NextResponse.json({ error: 'PDF şablonu gerekli' }, { status: 400 })
  if (file.size < 1 || file.size > MAX_TEMPLATE_BYTES) return NextResponse.json({ error: 'PDF boyutu geçersiz' }, { status: 413 })
  const bytes = new Uint8Array(await file.arrayBuffer())
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false }).catch(() => null)
  if (!pdf) return NextResponse.json({ error: 'Geçersiz PDF' }, { status: 415 })
  const pageCount = pdf.getPageCount()
  const firstPage = pdf.getPage(0)
  const dimensions = { widthPt: firstPage.getWidth(), heightPt: firstPage.getHeight() }
  const validation = validateBadgeTemplateUpload({ workspaceId: ctx.workspace.id, formId, originalName: file.name, mime: file.type || 'application/pdf', size: bytes.byteLength, bytes, pageCount, ...dimensions, visibility: 'private' })
  if (!validation.ok) return NextResponse.json({ error: 'PDF şablonu doğrulamadan geçmedi', code: validation.code }, { status: 415 })
  const templateId = `template-${randomBytes(8).toString('hex')}`
  const versionId = `version-${randomBytes(8).toString('hex')}`
  const stored = await storeBadgeTemplate({ scope: { workspaceId: ctx.workspace.id, formId, templateId, versionId }, originalName: file.name, bytes, pageCount: pageCount as 1 | 2, ...dimensions })
  if (!stored.ok) return NextResponse.json({ error: 'PDF şablonu kaydedilemedi', code: stored.code }, { status: stored.code === 'WRITE_CONFLICT' ? 409 : 500 })
  return NextResponse.json({ data: { templateId, versionId, pageCount: stored.manifest.pageCount, widthPt: stored.manifest.widthPt, heightPt: stored.manifest.heightPt, visibility: 'private', validationStatus: 'VALIDATED' } }, { status: 201 })
}
