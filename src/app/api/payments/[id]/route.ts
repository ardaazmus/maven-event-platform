import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

interface RouteParams {
  params: Promise<{ id: string }>
}

const reviewSchema = z.object({
  action: z.enum(['confirm', 'reject']),
})

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.manageBilling(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id } = await params
  const payment = await db.payment.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = reviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  if (payment.status !== 'recorded') {
    return NextResponse.json({ error: 'Already reviewed' }, { status: 409 })
  }

  // Four-eyes: recorder cannot approve own record
  if (parsed.data.action === 'confirm' && payment.recorderId === ctx.user.id) {
    return NextResponse.json({ error: 'Four-eyes approval required' }, { status: 403 })
  }

  const updated = await db.payment.update({
    where: { id },
    data: {
      status: parsed.data.action === 'confirm' ? 'confirmed' : 'rejected',
      approverId: ctx.user.id,
    },
  })

  return NextResponse.json({ data: { id: updated.id, status: updated.status } })
}
