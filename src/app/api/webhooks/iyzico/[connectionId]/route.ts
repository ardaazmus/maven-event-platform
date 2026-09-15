import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { decryptPaymentCredential } from '@/lib/payment-credentials'
import { verifyIyzicoV3WebhookSignature, type IyzicoWebhookSignatureInput } from '@/lib/payment-webhook-signatures'
import { canonicalIyzicoWebhookPaymentId } from '@/lib/payment-provider-contract'

interface RouteParams {
  params: Promise<{ connectionId: string }>
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= 255 && value === value.trim() && !/[\r\n\0]/.test(value) ? value : null
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
    where: { id: connectionId, provider: 'iyzico' },
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

  let event: unknown
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Webhook JSON gövdesi geçersiz' }, { status: 400 })
  }
  if (!event || typeof event !== 'object') return NextResponse.json({ error: 'Webhook olayı geçersiz' }, { status: 400 })

  const eventRecord = event as Record<string, unknown>
  const eventType = stringValue(eventRecord.iyziEventType)
  const paymentConversationId = stringValue(eventRecord.paymentConversationId)
  const status = stringValue(eventRecord.status)
  const paymentId = stringValue(eventRecord.paymentId)
  const iyziPaymentId = stringValue(eventRecord.iyziPaymentId)
  const token = stringValue(eventRecord.token)
  const format: IyzicoWebhookSignatureInput['format'] = iyziPaymentId && token ? 'hpp' : 'direct'
  if (!eventType || !paymentConversationId || !status || (format === 'direct' && !paymentId) || (format === 'hpp' && (!iyziPaymentId || !token))) {
    return NextResponse.json({ error: 'Webhook imza alanları eksik' }, { status: 400 })
  }

  const credentials = credentialsFromEnvelope(connection.credentialsEnvelope)
  const secretKey = stringValue(credentials?.secretKey)
  if (!secretKey) return NextResponse.json({ error: 'Webhook güvenliği yapılandırılmamış' }, { status: 503 })

  const signatureInput: IyzicoWebhookSignatureInput = {
    format,
    secretKey,
    eventType,
    paymentConversationId,
    status,
    ...(paymentId ? { paymentId } : {}),
    ...(iyziPaymentId ? { iyziPaymentId } : {}),
    ...(token ? { token } : {}),
  }
  if (!verifyIyzicoV3WebhookSignature(signatureInput, req.headers.get('x-iyz-signature-v3'))) {
    return NextResponse.json({ error: 'Webhook imzası geçersiz' }, { status: 401 })
  }

  const externalEventId = stringValue(eventRecord.iyziReferenceCode) || `payload:${createHash('sha256').update(rawBody, 'utf8').digest('hex')}`
  const providerPaymentId = canonicalIyzicoWebhookPaymentId({ format, paymentId, token })
  try {
    await db.paymentWebhookEvent.create({
      data: {
        workspaceId: connection.workspaceId,
        connectionId: connection.id,
        provider: 'iyzico',
        externalEventId,
        eventType,
        providerStatus: status,
        ...(providerPaymentId ? { providerPaymentId } : {}),
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
