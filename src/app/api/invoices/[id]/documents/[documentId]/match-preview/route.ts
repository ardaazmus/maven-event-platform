import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { evaluateInvoiceDocumentReady, matchInvoiceDocumentMetadata } from '@/lib/invoice-document-matching'

interface RouteParams {
  params: Promise<{ id: string; documentId: string }>
}

/** Returns a safe, read-only matching preview; it never approves or readies a document. */
export async function POST(req: Request, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.readInvoices(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id: invoiceId, documentId } = await params
  if (!invoiceId || invoiceId.length > 128 || !documentId || documentId.length > 128) return NextResponse.json({ error: 'Belge bulunamadı' }, { status: 404 })

  const document = await db.invoiceDocument.findFirst({
    where: { id: documentId, invoiceRecordId: invoiceId, invoiceRecord: { workspaceId: ctx.workspace.id } },
    select: {
      id: true,
      state: true,
      scanStatus: true,
      invoiceRecord: {
        select: {
          id: true,
          workspaceId: true,
          state: true,
          providerInvoiceId: true,
          invoiceUuid: true,
          invoiceNumber: true,
          paymentOrder: { select: { id: true, formId: true } },
        },
      },
    },
  })
  if (!document) return NextResponse.json({ error: 'Belge bulunamadı' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    const parsed = await req.json()
    body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return NextResponse.json({ error: 'Geçersiz eşleştirme isteği' }, { status: 400 })
  }
  const metadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata as Record<string, unknown> : null
  if (!metadata) return NextResponse.json({ error: 'metadata gerekli' }, { status: 400 })

  const candidates = await db.invoiceRecord.findMany({
    where: { workspaceId: ctx.workspace.id, paymentOrder: { formId: document.invoiceRecord.paymentOrder.formId } },
    select: {
      id: true,
      workspaceId: true,
      providerInvoiceId: true,
      invoiceUuid: true,
      invoiceNumber: true,
      paymentOrder: { select: { id: true, formId: true } },
    },
  })
  const match = matchInvoiceDocumentMetadata({
    ...metadata,
    workspaceId: ctx.workspace.id,
    formId: document.invoiceRecord.paymentOrder.formId,
  } as any, candidates.map(candidate => ({
    id: candidate.id,
    workspaceId: candidate.workspaceId,
    formId: candidate.paymentOrder.formId,
    paymentReference: candidate.paymentOrder.id,
    providerInvoiceId: candidate.providerInvoiceId,
    invoiceUuid: candidate.invoiceUuid,
    invoiceNumber: candidate.invoiceNumber,
  })))
  const readyGate = evaluateInvoiceDocumentReady({ match, approvalStatus: 'pending', invoiceState: document.invoiceRecord.state, scanStatus: document.scanStatus, documentState: document.state })

  return NextResponse.json({ data: { documentId: document.id, match, readyGate, requiresManualApproval: true } }, { headers: { 'Cache-Control': 'private, no-store' } })
}
