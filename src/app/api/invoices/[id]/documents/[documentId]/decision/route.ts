import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { db } from '@/lib/db'
import { approveInvoiceDocumentDecision } from '@/lib/invoice-document-decision-approval'
import type { InvoiceMatchStrategy } from '@/lib/invoice-matching'

interface RouteParams {
  params: Promise<{ id: string; documentId: string }>
}

const STRATEGIES = new Set<InvoiceMatchStrategy>(['row_id', 'payment_reference', 'provider_invoice_id', 'invoice_uuid', 'invoice_number'])

function text(value: unknown, maxLength: number): string | null {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength ? value.trim() : null
}

/** Authenticated approval boundary; only stable match metadata reaches the store. */
export async function POST(req: Request, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.writeInvoices(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id: invoiceRecordId, documentId } = await params
  if (!text(invoiceRecordId, 128) || !text(documentId, 128)) return NextResponse.json({ error: 'Belge bulunamadı' }, { status: 404 })
  let body: Record<string, unknown>
  try {
    const parsed = await req.json()
    body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return NextResponse.json({ error: 'Geçersiz karar isteği' }, { status: 400 })
  }
  const candidateId = text(body.candidateId, 128)
  const strategy = text(body.strategy, 64)
  const approvalStatus = body.approvalStatus === 'approved' || body.approvalStatus === 'rejected' ? body.approvalStatus : null
  if (!candidateId || !strategy || !STRATEGIES.has(strategy as InvoiceMatchStrategy) || !approvalStatus) return NextResponse.json({ error: 'Karar alanları eksik veya geçersiz' }, { status: 400 })

  const result = await approveInvoiceDocumentDecision({ workspaceId: ctx.workspace.id, invoiceDocumentId: documentId as string, invoiceRecordId: invoiceRecordId as string, candidateId, strategy: strategy as InvoiceMatchStrategy, approvalStatus, approvedById: ctx.user.id }, db, async (input, client) => {
    const { saveInvoiceDocumentDecision } = await import('@/lib/invoice-document-decision-store')
    return saveInvoiceDocumentDecision(input, client)
  })
  if (result.status === 'blocked') return NextResponse.json({ error: 'Belge kararı kaydedilemedi', reason: result.reason }, { status: 409 })
  return NextResponse.json({ data: { status: result.status, decisionId: result.decisionId } }, { headers: { 'Cache-Control': 'private, no-store' } })
}
