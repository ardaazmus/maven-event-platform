import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

interface RouteParams {
  params: Promise<{ id: string }>
}

const deliverySchema = z.object({
  channel: z.enum(['email', 'manual']),
})

export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writeInvoices(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id } = await params
  const invoice = await db.invoice.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (invoice.status !== 'issued' && invoice.status !== 'delivered') {
    return NextResponse.json({ error: 'Only issued invoices can be delivered' }, { status: 409 })
  }

  const body = await req.json().catch(() => null)
  const parsed = deliverySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  // Idempotent resend: same key returns the same row, no duplicate
  const headerKey = req.headers.get('Idempotency-Key')
  if (headerKey) {
    const existing = await db.invoiceDelivery.findUnique({ where: { idempotencyKey: headerKey } })
    if (existing && existing.invoiceId === id) {
      return NextResponse.json({ data: { id: existing.id, status: existing.status } })
    }
  }

  const delivery = await db.invoiceDelivery.create({
    data: {
      workspaceId: ctx.workspace.id,
      invoiceId: id,
      channel: parsed.data.channel,
      idempotencyKey: headerKey || `del_${randomBytes(16).toString('hex')}`,
      status: 'queued',
    },
  })

  return NextResponse.json({ data: { id: delivery.id, status: delivery.status } }, { status: 201 })
}
