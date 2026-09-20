import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

export async function GET(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.readInvoices(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const provider = req.nextUrl.searchParams.get('provider')?.trim() || null

  // Ham provider payload asla listelenmez; yalniz isleme metadata doner.
  const rows = await db.paymentWebhookEvent.findMany({
    where: { workspaceId: ctx.workspace.id, ...(provider ? { provider } : {}) },
    orderBy: { receivedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      provider: true,
      eventType: true,
      providerStatus: true,
      amountMinor: true,
      currency: true,
      signatureVerified: true,
      processingStatus: true,
      attemptCount: true,
      failureCode: true,
      receivedAt: true,
      processedAt: true,
    },
  })

  return NextResponse.json({ data: rows })
}
