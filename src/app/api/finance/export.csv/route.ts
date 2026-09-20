import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

function cell(value: unknown) {
  const s = value === null || value === undefined ? '' : String(value)
  return `"${s.replace(/"/g, '""')}"`
}

export async function GET() {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.manageBilling(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const payments = await db.payment.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  })

  const header = 'id,method,source,currency,amountMinor,status,valueDate,reference,createdAt'
  const rows = payments.map((p) =>
    [
      cell(p.id),
      cell(p.method),
      cell(p.source),
      cell(p.currency),
      cell(p.amountMinor),
      cell(p.status),
      cell(p.valueDate.toISOString()),
      cell(p.reference),
      cell(p.createdAt.toISOString()),
    ].join(','),
  )

  return new NextResponse([header, ...rows].join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ledger-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
