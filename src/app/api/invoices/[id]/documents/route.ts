import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { invoiceDocumentStoragePath, INVOICE_DOCUMENT_ROOT } from '@/lib/invoice-document-storage'
import { validateInvoiceArchiveUpload, validateInvoiceDocumentUpload } from '@/lib/invoice-document-validation'

interface RouteParams {
  params: Promise<{ id: string }>
}

function extensionFor(filename: string): 'pdf' | 'xml' | 'xlsx' | null {
  const extension = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase()
  return extension === 'pdf' || extension === 'xml' || extension === 'xlsx' ? extension : null
}

const documentSelect = { id: true, artifactKind: true, mime: true, size: true, sha256: true, scanStatus: true, visibility: true, state: true, createdAt: true } as const

function documentResponse(data: unknown, status: 200 | 201, duplicate: boolean) {
  return NextResponse.json(duplicate ? { data, duplicate: true } : { data }, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

/** Stores an authenticated invoice artifact in private quarantine only. */
export async function POST(req: Request, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = can.writeInvoices(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id: invoiceId } = await params
  if (!invoiceId || invoiceId.length > 128) return NextResponse.json({ error: 'Fatura bulunamadı' }, { status: 404 })

  const invoice = await db.invoiceRecord.findFirst({
    where: { id: invoiceId, workspaceId: ctx.workspace.id },
    select: { id: true, workspaceId: true, paymentOrder: { select: { formId: true, workspaceId: true } } },
  })
  if (!invoice || invoice.workspaceId !== ctx.workspace.id || invoice.paymentOrder.workspaceId !== ctx.workspace.id) return NextResponse.json({ error: 'Fatura bulunamadı' }, { status: 404 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Geçersiz multipart isteği' }, { status: 400 })
  }
  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'file gerekli' }, { status: 400 })
  const extension = extensionFor(file.name)
  if (!extension) return NextResponse.json({ error: 'Desteklenmeyen belge türü' }, { status: 415 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Belge çok büyük' }, { status: 413 })

  const bytes = new Uint8Array(await file.arrayBuffer())
  const validation = extension === 'xlsx'
    ? validateInvoiceArchiveUpload({ filename: file.name, mime: file.type, size: file.size, bytes })
    : validateInvoiceDocumentUpload({ filename: file.name, mime: file.type, size: file.size, bytes })
  if (!validation.ok) {
    const status = validation.code === 'size_invalid' || validation.code === 'size_mismatch' ? 413 : 415
    return NextResponse.json({ error: 'Belge doğrulanamadı' }, { status })
  }

  const duplicateWhere = { invoiceRecordId: invoice.id, artifactKind: validation.kind, sha256: validation.sha256 }
  const existing = await db.invoiceDocument.findFirst({ where: duplicateWhere, select: documentSelect })
  if (existing) return documentResponse(existing, 200, true)

  const documentId = randomUUID()
  const storageKey = invoiceDocumentStoragePath(ctx.workspace.id, invoice.id, documentId, extension)
  const storageRoot = path.resolve(process.cwd(), INVOICE_DOCUMENT_ROOT)
  const fullPath = path.resolve(process.cwd(), storageKey)
  if (fullPath !== storageRoot && !fullPath.startsWith(`${storageRoot}${path.sep}`)) return NextResponse.json({ error: 'Güvenli olmayan belge yolu' }, { status: 500 })

  await mkdir(path.dirname(fullPath), { recursive: true })
  await writeFile(fullPath, bytes, { flag: 'wx' })
  try {
    const document = await db.$transaction(async tx => {
      const created = await tx.invoiceDocument.create({
        data: {
          id: documentId,
          invoiceRecordId: invoice.id,
          artifactKind: validation.kind,
          storageKey,
          mime: validation.detectedMime,
          size: bytes.byteLength,
          sha256: validation.sha256,
          scanStatus: 'pending',
          visibility: 'private',
          state: 'quarantined',
        },
        select: documentSelect,
      })
      await tx.auditLog.create({
        data: {
          workspaceId: ctx.workspace.id,
          actorId: ctx.user.id,
          action: 'invoice.document.upload',
          resourceType: 'invoice_document',
          resourceId: documentId,
          beforeJson: null,
          afterJson: JSON.stringify({ invoiceId: invoice.id, formId: invoice.paymentOrder.formId, artifactKind: validation.kind, size: bytes.byteLength, sha256: validation.sha256, state: 'quarantined' }),
        },
      })
      return document
    })
    return documentResponse(document, 201, false)
  } catch (error) {
    await unlink(fullPath).catch(() => undefined)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      const duplicate = await db.invoiceDocument.findFirst({ where: duplicateWhere, select: documentSelect })
      if (duplicate) return documentResponse(duplicate, 200, true)
    }
    return NextResponse.json({ error: 'Belge karantinaya alınamadı' }, { status: 500 })
  }
}
