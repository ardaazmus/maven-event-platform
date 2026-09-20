import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

const intentSchema = z.object({
  orderId: z.string().min(1),
  provider: z.enum(['iyzico', 'stripe']).optional().default('iyzico'),
})

export async function POST(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.manageBilling(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const body = await req.json().catch(() => null)
  const parsed = intentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const headerKey = req.headers.get('Idempotency-Key')
  if (headerKey) {
    const existing = await db.checkoutIntent.findUnique({ where: { idempotencyKey: headerKey } })
    if (existing && existing.workspaceId === ctx.workspace.id) {
      return NextResponse.json({ data: { id: existing.id, amountMinor: existing.amountMinor, status: existing.status } })
    }
  }

  const order = await db.order.findFirst({
    where: { id: parsed.data.orderId, workspaceId: ctx.workspace.id },
    include: { items: true },
  })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Server-priced: client tutarı kabul edilmez; snapshot toplamı kullanılır
  const amountMinor = order.items.reduce((sum, it) => sum + it.quantity * it.unitAmountMinor + it.taxAmountMinor - it.discountAmountMinor, 0)

  const intent = await db.checkoutIntent.create({
    data: {
      workspaceId: ctx.workspace.id,
      orderId: order.id,
      provider: parsed.data.provider ?? 'iyzico',
      mode: 'test',
      currency: order.currency,
      amountMinor,
      idempotencyKey: headerKey || `ci_${randomBytes(16).toString('hex')}`,
    },
  })

  return NextResponse.json({ data: { id: intent.id, amountMinor: intent.amountMinor, status: intent.status } }, { status: 201 })
}
