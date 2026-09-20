import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

interface RouteParams {
  params: Promise<{ id: string }>
}

const relationSchema = z.object({
  targetInvoiceId: z.string().min(1),
  type: z.enum(['cancel', 'credit', 'debit', 'replacement']),
})

export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writeInvoices(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id } = await params
  const source = await db.invoice.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = relationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  if (parsed.data.targetInvoiceId === id) {
    return NextResponse.json({ error: 'Self relation not allowed' }, { status: 400 })
  }

  const target = await db.invoice.findFirst({ where: { id: parsed.data.targetInvoiceId, workspaceId: ctx.workspace.id } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const existing = await db.invoiceRelation.findUnique({
    where: { sourceInvoiceId_targetInvoiceId_type: { sourceInvoiceId: id, targetInvoiceId: target.id, type: parsed.data.type } },
  })
  if (existing) return NextResponse.json({ error: 'Already related' }, { status: 409 })

  const relation = await db.invoiceRelation.create({
    data: { workspaceId: ctx.workspace.id, sourceInvoiceId: id, targetInvoiceId: target.id, type: parsed.data.type },
  })

  return NextResponse.json({ data: { id: relation.id } }, { status: 201 })
}
