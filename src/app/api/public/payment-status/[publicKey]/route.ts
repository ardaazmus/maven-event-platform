import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'
import { isPublicPaymentKey } from '@/lib/payment-status-key'
import { sanitizePublicPaymentStatus } from '@/lib/public-payment-status-dto'

interface RouteParams {
  params: Promise<{ publicKey: string }>
}

const noStoreHeaders = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }

function clientAddress(req: NextRequest): string {
  return req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

function notFoundResponse() {
  return NextResponse.json({ error: 'Ödeme durumu bulunamadı' }, { status: 404, headers: noStoreHeaders })
}

/** Returns only the public, non-sensitive state of an opaque payment receipt. */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const rate = checkRateLimit(`public-payment-status:${clientAddress(req)}`, 30, 60_000)
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla istek' },
      { status: 429, headers: { ...noStoreHeaders, 'Retry-After': '60' } },
    )
  }

  const { publicKey } = await params
  if (!isPublicPaymentKey(publicKey)) return notFoundResponse()

  try {
    const order = await db.paymentOrder.findUnique({
      where: { publicKey },
      select: { publicKey: true, status: true, amountMinor: true, currency: true },
    })
    const data = sanitizePublicPaymentStatus(order)
    return data ? NextResponse.json({ data }, { headers: noStoreHeaders }) : notFoundResponse()
  } catch {
    return NextResponse.json({ error: 'Ödeme durumu alınamadı' }, { status: 503, headers: noStoreHeaders })
  }
}
