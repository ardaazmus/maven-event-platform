import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

interface RouteParams {
  params: Promise<{ id: string }>
}

const reversalSchema = z.object({
  reason: z.string().max(500).optional().nullable(),
})

export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.manageBilling(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id } = await params
  const payment = await db.payment.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (payment.status !== 'confirmed') {
    return NextResponse.json({ error: 'Only confirmed payments can be reversed' }, { status: 409 })
  }

  const body = await req.json().catch(() => null)
  const parsed = reversalSchema.safeParse(body ?? {})
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const result = await db.$transaction(async (tx) => {
    const existing = await tx.payment.findFirst({ where: { reversalOfId: id }, select: { id: true } })
    if (existing) throw Object.assign(new Error('Already reversed'), { status: 409 })
    await tx.payment.update({ where: { id }, data: { status: 'reversed' } })
    const counter = await tx.payment.create({
      data: {
        workspaceId: payment.workspaceId,
        orderId: payment.orderId,
        payerName: payment.payerName,
        currency: payment.currency,
        amountMinor: payment.amountMinor,
        method: payment.method,
        source: payment.source,
        valueDate: new Date(),
        reference: payment.reference ? `reversal-${payment.reference}` : `reversal-${payment.id}`,
        status: 'confirmed',
        recorderId: ctx.user.id,
        reversalOfId: id,
        idempotencyKey: `rev_${randomBytes(16).toString('hex')}`,
      },
    })
    return counter
  }).catch((e: any) => {
    if (e?.status === 409) return null
    throw e
  })

  if (!result) return NextResponse.json({ error: 'Already reversed' }, { status: 409 })
  return NextResponse.json({ data: { id: result.id } }, { status: 201 })
}
