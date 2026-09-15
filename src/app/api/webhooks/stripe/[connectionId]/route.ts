import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { decryptPaymentCredential } from '@/lib/payment-credentials'
import { verifyStripeWebhookSignature } from '@/lib/payment-webhook-signatures'

interface RouteParams {
  params: Promise<{ connectionId: string }>
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= 255 && value === value.trim() && !/[\r\n\0]/.test(value) ? value : null
}

function referenceValue(value: unknown): string | null {
  if (typeof value === 'string') return value.length > 0 ? value : null
  if (value && typeof value === 'object' && !Array.isArray(value)) return stringValue((value as Record<string, unknown>).id)
  return null
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

function credentialsFromEnvelope(envelope: string | null): Record<string, unknown> | null {
  if (!envelope) return null
  try {
    const value: unknown = JSON.parse(decryptPaymentCredential(envelope))
    return value && typeof value === 'object' ? value as Record<string, unknown> : null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { connectionId } = await params
  const connection = await db.paymentProviderConnection.findFirst({
    where: { id: connectionId, provider: 'stripe' },
    select: {
      id: true,
      workspaceId: true,
      status: true,
      credentialsEnvelope: true,
    },
  })
  if (!connection) return NextResponse.json({ error: 'Webhook bulunamadı' }, { status: 404 })
  if (connection.status === 'revoked') return NextResponse.json({ error: 'Webhook devre dışı' }, { status: 410 })
  if (connection.status !== 'active') return NextResponse.json({ error: 'Webhook bağlantısı doğrulanmadı' }, { status: 503 })

  const rawBody = await req.text()
  if (!rawBody || Buffer.byteLength(rawBody, 'utf8') > 1024 * 1024) {
    return NextResponse.json({ error: 'Geçersiz webhook gövdesi' }, { status: 413 })
  }

  const credentials = credentialsFromEnvelope(connection.credentialsEnvelope)
  const endpointSecret = stringValue(credentials?.webhookSecret)
  if (!endpointSecret) return NextResponse.json({ error: 'Webhook güvenliği yapılandırılmamış' }, { status: 503 })

  if (!verifyStripeWebhookSignature(rawBody, req.headers.get('stripe-signature'), endpointSecret)) {
    return NextResponse.json({ error: 'Webhook imzası geçersiz' }, { status: 401 })
  }

  let event: unknown
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Webhook JSON gövdesi geçersiz' }, { status: 400 })
  }
  if (!event || typeof event !== 'object') return NextResponse.json({ error: 'Webhook olayı geçersiz' }, { status: 400 })

  const eventRecord = event as Record<string, unknown>
  const externalEventId = stringValue(eventRecord.id)
  const eventType = stringValue(eventRecord.type)
  if (!externalEventId || !eventType) return NextResponse.json({ error: 'Webhook event kimliği eksik' }, { status: 400 })
  const data = eventRecord.data
  const dataRecord = data && typeof data === 'object' ? data as Record<string, unknown> : null
  const providerObject = dataRecord?.object
  const providerObjectRecord = providerObject && typeof providerObject === 'object' ? providerObject as Record<string, unknown> : null
  const providerObjectId = stringValue(providerObjectRecord?.id)
  const chargeRefundOrDisputeEvent = eventType === 'charge.refunded' || eventType === 'charge.dispute.created'
  const providerPaymentId = chargeRefundOrDisputeEvent ? referenceValue(providerObjectRecord?.payment_intent) : providerObjectId
  const amountMinor = nonNegativeInteger(providerObjectRecord?.amount)
  const currency = stringValue(providerObjectRecord?.currency)?.toUpperCase() ?? null
  const amountRefunded = nonNegativeInteger(providerObjectRecord?.amount_refunded)
  const refundStatus = eventType === 'charge.refunded' && amountMinor !== null && amountRefunded !== null && amountRefunded <= amountMinor
    ? amountRefunded === amountMinor ? 'REFUNDED' : 'PARTIALLY_REFUNDED'
    : null

  try {
    await db.paymentWebhookEvent.create({
      data: {
        workspaceId: connection.workspaceId,
        connectionId: connection.id,
        provider: 'stripe',
        externalEventId,
        eventType,
        ...(providerPaymentId ? { providerPaymentId } : {}),
        ...(amountMinor !== null ? { amountMinor } : {}),
        ...(currency ? { currency } : {}),
        ...(refundStatus ? { providerStatus: refundStatus } : {}),
        payloadHash: createHash('sha256').update(rawBody, 'utf8').digest('hex'),
        signatureVerified: true,
        processingStatus: 'received',
      },
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ received: true, duplicate: true })
    }
    return NextResponse.json({ error: 'Webhook inbox kaydı oluşturulamadı' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
