import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import {
  INVOICE_IMPORT_MAX_SIZE,
  INVOICE_IMPORT_ROOT,
  invoiceImportStoragePath,
  validateInvoiceImportUpload,
} from '@/lib/invoice-import-quarantine'

export async function POST(req: Request) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = can.writeInvoices(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Geçersiz multipart isteği' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'file gerekli' }, { status: 400 })
  if (file.size > INVOICE_IMPORT_MAX_SIZE) return NextResponse.json({ error: 'Import dosyası çok büyük' }, { status: 413 })

  const bytes = new Uint8Array(await file.arrayBuffer())
  const validation = validateInvoiceImportUpload({ filename: file.name, mime: file.type, size: file.size, bytes })
  if (!validation.ok) {
    const status = validation.code === 'invalid_size' || validation.code === 'size_mismatch' ? 413 : 415
    return NextResponse.json({ error: 'Import dosyası doğrulanamadı' }, { status })
  }

  const uploadId = randomUUID()
  const storageKey = invoiceImportStoragePath(ctx.workspace.id, uploadId)
  const storageRoot = path.resolve(process.cwd(), INVOICE_IMPORT_ROOT)
  const fullPath = path.resolve(process.cwd(), storageKey)
  if (fullPath !== storageRoot && !fullPath.startsWith(`${storageRoot}${path.sep}`)) {
    return NextResponse.json({ error: 'Güvenli olmayan import yolu' }, { status: 500 })
  }

  await mkdir(path.dirname(fullPath), { recursive: true })
  await writeFile(fullPath, bytes, { flag: 'wx' })
  try {
    const batch = await db.$transaction(async tx => {
      const created = await tx.invoiceImportBatch.create({
        data: {
          id: uploadId,
          workspaceId: ctx.workspace.id,
          uploadedById: ctx.user.id,
          storageKey,
          originalFilename: file.name.slice(0, 255),
          mime: validation.detectedMime,
          size: bytes.byteLength,
          sha256: validation.sha256,
          scanStatus: 'quarantined',
          state: 'quarantined',
        },
        select: { id: true, originalFilename: true, mime: true, size: true, sha256: true, scanStatus: true, state: true, createdAt: true },
      })
      await tx.auditLog.create({
        data: {
          workspaceId: ctx.workspace.id,
          actorId: ctx.user.id,
          action: 'invoice.import.upload',
          resourceType: 'invoice_import_batch',
          resourceId: uploadId,
          beforeJson: null,
          afterJson: JSON.stringify({ source: 'accounting_upload', size: bytes.byteLength, sha256: validation.sha256, state: 'quarantined' }),
        },
      })
      return created
    })

    return NextResponse.json({ data: batch }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    await unlink(fullPath).catch(() => undefined)
    if (error instanceof Error && error.message.includes('InvoiceImportBatch_workspaceId_sha256')) {
      return NextResponse.json({ error: 'Aynı import dosyası daha önce alındı' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Import dosyası karantinaya alınamadı' }, { status: 500 })
  }
}
