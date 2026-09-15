import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { INVOICE_DOCUMENT_ROOT } from '@/lib/invoice-document-storage'

interface RouteParams {
  params: Promise<{ id: string; documentId: string }>
}

/** Serves only a clean, ready, private invoice artifact inside its tenant scope. */
export async function GET(_req: Request, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.readInvoices(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id: invoiceRecordId, documentId } = await params
  if (!invoiceRecordId || invoiceRecordId.length > 128 || !documentId || documentId.length > 128) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const document = await db.invoiceDocument.findFirst({
    where: {
      id: documentId,
      invoiceRecordId,
      visibility: 'private',
      state: 'quarantined',
      scanStatus: 'clean',
      readyAt: { not: null },
      invoiceRecord: { id: invoiceRecordId, workspaceId: ctx.workspace.id, paymentOrder: { workspaceId: ctx.workspace.id } },
    },
    select: { id: true, storageKey: true, mime: true, invoiceRecord: { select: { workspaceId: true } } },
  })
  if (!document || document.invoiceRecord.workspaceId !== ctx.workspace.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const root = path.resolve(process.cwd(), INVOICE_DOCUMENT_ROOT)
    const fullPath = path.resolve(process.cwd(), document.storageKey)
    if (fullPath === root || !fullPath.startsWith(`${root}${path.sep}`)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const bytes = await readFile(fullPath)
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': document.mime,
        'Content-Disposition': document.mime === 'application/pdf' ? 'inline' : 'attachment',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
