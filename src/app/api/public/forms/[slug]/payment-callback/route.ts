import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { buildPublicPaymentStatusApiPath } from '@/lib/payment-status-key'
import { parseIyzicoCallbackInput } from '@/lib/iyzico-callback-input'
import { correlatePublicPaymentReceipt } from '@/lib/payment-receipt-correlation'
import { queueIyzicoPaymentRetrieve } from '@/lib/payment-retrieve-handoff'

interface RouteParams {
  params: Promise<{ slug: string }>
}

const noStoreHeaders = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }

function parseObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

async function readCallbackBody(req: NextRequest): Promise<Record<string, unknown>> {
  if (req.method === 'GET') return {}
  const raw = await req.text()
  if (raw.length > 16 * 1024) throw new Error('callback body too large')
  if (!raw) return {}
  if (req.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    const parsed = parseObject(JSON.parse(raw))
    if (!parsed) throw new Error('callback body invalid')
    return parsed
  }
  return Object.fromEntries(new URLSearchParams(raw).entries())
}

function genericError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: noStoreHeaders })
}

async function handleCallback(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(slug)) return genericError('Ödeme geri dönüşü geçersiz', 400)

  let body: Record<string, unknown>
  try {
    body = await readCallbackBody(req)
  } catch {
    return genericError('Ödeme geri dönüşü geçersiz', 400)
  }

  const query = req.nextUrl.searchParams
  const callbackInput = {
    ...body,
    ...(body.token === undefined && query.has('token') ? { token: query.get('token') } : {}),
    ...(body.status === undefined && query.has('status') ? { status: query.get('status') } : {}),
    ...(body.receipt === undefined && query.has('receipt') ? { receipt: query.get('receipt') } : {}),
  }
  const parsed = parseIyzicoCallbackInput(callbackInput)
  if (!parsed.ok) return genericError('Ödeme geri dönüşü geçersiz', 400)

  const order = await db.paymentOrder.findUnique({
    where: { publicKey: parsed.publicKey },
    select: { id: true, publicKey: true, form: { select: { slug: true } } },
  })
  if (!order) return genericError('Ödeme geri dönüşü bulunamadı', 404)
  const correlation = correlatePublicPaymentReceipt({ publicKey: parsed.publicKey, requestedSlug: slug, storedSlug: order.form.slug })
  if (!correlation.ok) return genericError('Ödeme geri dönüşü bulunamadı', 404)

  const queued = await db.$transaction(tx => queueIyzicoPaymentRetrieve(tx, { paymentOrderId: order.id, providerReference: parsed.token }))
  if (!queued.ok) return genericError('Ödeme geri dönüşü bulunamadı', 404)

  const statusPath = buildPublicPaymentStatusApiPath(parsed.publicKey)
  if (!statusPath) return genericError('Ödeme makbuzu bulunamadı', 400)

  // Callback yalnız status polling yolunu verir; provider success değeri burada
  // finansal başarıya çevrilmez. Retrieve/webhook reducer’ı tek otoritedir.
  return NextResponse.json({ data: { status: 'processing', statusPath } }, { headers: noStoreHeaders })
}

/** Accepts an iyzico callback only as a non-authoritative receipt handoff. */
export async function GET(req: NextRequest, context: RouteParams) {
  return handleCallback(req, context)
}

/** Accepts form or JSON callback bodies without changing payment state. */
export async function POST(req: NextRequest, context: RouteParams) {
  return handleCallback(req, context)
}
