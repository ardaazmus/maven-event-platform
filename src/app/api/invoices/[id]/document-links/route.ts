import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

interface RouteParams {
  params: Promise<{ id: string }>
}

const attachSchema = z.object({
  mediaAssetId: z.string().min(1),
})

// F3-3.3: link a clean MediaAsset as new-Invoice document. Quarantined
// artifacts stay on the legacy InvoiceRecord documents route (F3-14A: this
// handler moved off documents/route.ts to preserve the legacy contract).
export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writeInvoices(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id } = await params
  const invoice = await db.invoice.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = attachSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const asset = await db.mediaAsset.findFirst({
    where: { id: parsed.data.mediaAssetId, workspaceId: ctx.workspace.id },
  })
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (asset.scanStatus !== 'clean') {
    return NextResponse.json({ error: 'Document quarantined', scanStatus: asset.scanStatus }, { status: 422 })
  }

  await db.mediaAsset.update({ where: { id: asset.id }, data: { invoiceId: id } })
  return NextResponse.json({ data: { id: asset.id } }, { status: 201 })
}
