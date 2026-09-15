import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { executeInvoiceDocumentReadyFlow } from '@/lib/invoice-document-ready-caller'
import type { InvoiceDocumentMatchResult } from '@/lib/invoice-document-matching'

interface RouteParams {
  params: Promise<{ id: string; documentId: string }>
}

function text(value: unknown, maxLength: number): string | null {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength ? value.trim() : null
}

function parseMatch(value: unknown): InvoiceDocumentMatchResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const candidate = value as Record<string, unknown>
  if (candidate.status !== 'matched' || candidate.strategy !== 'payment_reference' || !text(candidate.candidateId, 128)) return null
  return { status: 'matched', strategy: 'payment_reference', candidateId: candidate.candidateId as string, requiresManualApproval: true }
}

/** Authenticated approval boundary; workspace and actor identity come only from the session. */
export async function POST(req: Request, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.writeInvoices(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id: invoiceRecordId, documentId } = await params
  if (!text(invoiceRecordId, 128) || !text(documentId, 128)) return NextResponse.json({ error: 'Belge bulunamadı' }, { status: 404 })
  const contentLength = Number(req.headers.get('content-length') || 0)
  if (contentLength > 32_768) return NextResponse.json({ error: 'İstek çok büyük' }, { status: 413 })

  let body: Record<string, unknown>
  try {
    const parsed = await req.json()
    body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return NextResponse.json({ error: 'Geçersiz belge hazır olma isteği' }, { status: 400 })
  }
  const match = parseMatch(body.match)
  const approvalStatus = body.approvalStatus === 'approved' ? 'approved' : body.approvalStatus === 'rejected' ? 'rejected' : 'pending'
  const appOrigin = process.env.MAVENFORMS_APP_ORIGIN?.trim() || new URL(req.url).origin
  if (!match) return NextResponse.json({ error: 'Belge eşleştirme alanı eksik' }, { status: 400 })

  const result = await executeInvoiceDocumentReadyFlow(ctx as any, {
    invoiceRecordId: invoiceRecordId as string,
    documentId: documentId as string,
    match,
    approvalStatus,
    documentUrl: new URL(`/api/invoices/${invoiceRecordId}/documents/${documentId}`, appOrigin).toString(),
    appOrigin,
  })
  if (result.status === 'blocked') return NextResponse.json({ error: 'Belge hazır değil', reason: result.reason }, { status: result.reason === 'unauthorized' ? 403 : 409 })
  return NextResponse.json({ data: { status: result.status, documentDecision: result.documentDecision, deliveryStatus: result.delivery.status } }, { headers: { 'Cache-Control': 'private, no-store' } })
}
