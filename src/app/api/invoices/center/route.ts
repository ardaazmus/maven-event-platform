import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { db } from '@/lib/db'
import { listInvoiceCenter } from '@/lib/invoice-center-read-model'

function boundedText(value: string | null, max: number): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed && trimmed.length <= max ? trimmed : undefined
}

export async function GET(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.readInvoices(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const params = req.nextUrl.searchParams
  const requestedLimit = Number(params.get('limit') ?? '25')
  if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) return NextResponse.json({ error: 'limit geçersiz' }, { status: 400 })
  const cursor = boundedText(params.get('cursor'), 128)
  const query = boundedText(params.get('q'), 120)
  const formId = boundedText(params.get('formId'), 128)
  const state = boundedText(params.get('state'), 80)
  const result = await listInvoiceCenter({ db, workspaceId: ctx.workspace.id, limit: requestedLimit, cursor, query, formId, state })
  return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } })
}
