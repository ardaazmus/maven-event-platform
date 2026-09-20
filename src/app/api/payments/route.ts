import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

const recordPaymentSchema = z.object({
  orderId: z.string().min(1).optional().nullable(),
  payerName: z.string().max(200).optional().nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional().default('TRY'),
  amountMinor: z.number().int().min(1).max(1_000_000_000_000),
  method: z.enum(['bank_transfer', 'cash', 'cheque', 'po', 'external_pos']),
  valueDate: z.string().datetime().optional(),
  reference: z.string().max(200).optional().nullable(),
  evidenceHash: z.string().max(128).optional().nullable(),
})

export async function GET(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.readInvoices(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const orderId = req.nextUrl.searchParams.get('orderId')?.trim() || null
  if (orderId) {
    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order || order.workspaceId !== ctx.workspace.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  const rows = await db.payment.findMany({
    where: { workspaceId: ctx.workspace.id, ...(orderId ? { orderId } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { _count: { select: { allocations: true } } },
  })

  const orderIds = [...new Set(rows.map((row) => row.orderId).filter((value): value is string => !!value))]
  const linked = orderIds.length
    ? await db.order.findMany({ where: { workspaceId: ctx.workspace.id, id: { in: orderIds } }, select: { id: true, status: true } })
    : []
  const orderStatus = new Map(linked.map((order) => [order.id, order.status]))

  return NextResponse.json({
    data: rows.map((row) => ({
      id: row.id,
      status: row.status,
      method: row.method,
      source: row.source,
      amountMinor: row.amountMinor,
      currency: row.currency,
      payerName: row.payerName,
      reference: row.reference,
      valueDate: row.valueDate,
      orderId: row.orderId,
      orderStatus: row.orderId ? orderStatus.get(row.orderId) ?? null : null,
      allocationCount: row._count.allocations,
      createdAt: row.createdAt,
    })),
  })
}

export async function POST(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Interim mapping: finance Recorder/Approver rolleri F2 rol fazında gelir
  const _auth = can.manageBilling(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const body = await req.json().catch(() => null)
  const parsed = recordPaymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
  }

  if (parsed.data.orderId) {
    const order = await db.order.findFirst({ where: { id: parsed.data.orderId, workspaceId: ctx.workspace.id } })
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (order.currency !== parsed.data.currency) {
      return NextResponse.json({ error: 'Currency mismatch' }, { status: 400 })
    }
  }

  // Duplicate warning: same reference+amount+currency+date in workspace -> review
  if (parsed.data.reference) {
    const valueDate = parsed.data.valueDate ? new Date(parsed.data.valueDate) : null
    const dup = await db.payment.findFirst({
      where: {
        workspaceId: ctx.workspace.id,
        reference: parsed.data.reference,
        amountMinor: parsed.data.amountMinor,
        currency: parsed.data.currency,
        ...(valueDate ? { valueDate } : {}),
      },
      select: { id: true },
    })
    if (dup) return NextResponse.json({ error: 'Duplicate review', duplicateOf: dup.id }, { status: 409 })
  }

  const payment = await db.payment.create({
    data: {
      workspaceId: ctx.workspace.id,
      orderId: parsed.data.orderId ?? null,
      payerName: parsed.data.payerName ?? null,
      currency: parsed.data.currency ?? 'TRY',
      amountMinor: parsed.data.amountMinor,
      method: parsed.data.method,
      source: 'manual',
      valueDate: parsed.data.valueDate ? new Date(parsed.data.valueDate) : new Date(),
      reference: parsed.data.reference ?? null,
      status: 'recorded',
      recorderId: ctx.user.id,
      evidenceHash: parsed.data.evidenceHash ?? null,
      idempotencyKey: `pay_${randomBytes(16).toString('hex')}`,
    },
  })

  return NextResponse.json({ data: { id: payment.id, status: payment.status } }, { status: 201 })
}
