import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { decryptEmailCredential } from '@/lib/email-credentials'
import { buildEmailProviderEventCreateData } from '@/lib/email-provider-event'
import { normalizeMailchimpTransactionalWebhook } from '@/lib/mailchimp-webhook'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ connectionId: string }>
}

const MAX_BODY_BYTES = 5 * 1024 * 1024

function response(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}

function safeWebhookError(error: unknown): { error: string; status: number } {
  const code = error instanceof Error ? error.message : ''
  if (code === 'webhook_signature_invalid') return { error: 'webhook_signature_invalid', status: 401 }
  if (code === 'webhook_payload_invalid' || code === 'webhook_event_id_invalid') {
    return { error: 'webhook_payload_invalid', status: 400 }
  }
  return { error: 'webhook_unavailable', status: 503 }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { connectionId } = await params
  const connection = await db.emailProviderConnection.findFirst({
    where: { id: connectionId, provider: 'mailchimp_transactional', status: 'active' },
    select: {
      id: true,
      workspaceId: true,
      webhookSecretEnvelope: true,
    },
  })
  if (!connection || !connection.webhookSecretEnvelope) return response('webhook_unavailable', 404)

  const contentLength = Number(req.headers.get('content-length') || 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return response('webhook_payload_too_large', 413)

  const rawBody = await req.text()
  if (!rawBody || Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) return response('webhook_payload_too_large', 413)

  let webhookKey: string
  try {
    webhookKey = decryptEmailCredential(connection.webhookSecretEnvelope).trim()
  } catch {
    return response('webhook_unavailable', 503)
  }
  if (!webhookKey) return response('webhook_unavailable', 503)

  const paramsRecord = Object.fromEntries(new URLSearchParams(rawBody).entries())
  const payloadHash = `sha256:${createHash('sha256').update(rawBody, 'utf8').digest('hex')}`

  let normalized: ReturnType<typeof normalizeMailchimpTransactionalWebhook>
  try {
    normalized = normalizeMailchimpTransactionalWebhook({
      workspaceId: connection.workspaceId,
      webhookUrl: req.url,
      params: paramsRecord,
      signatureHeader: req.headers.get('x-mandrill-signature'),
      webhookKey,
      payloadHash,
    })
  } catch (error) {
    const safeError = safeWebhookError(error)
    return response(safeError.error, safeError.status)
  }

  try {
    await db.$transaction(async tx => {
      for (const { event } of normalized.events) {
        const data = buildEmailProviderEventCreateData(connection.workspaceId, event)
        await tx.emailProviderEvent.upsert({
          where: {
            workspaceId_provider_externalEventId: {
              workspaceId: data.workspaceId,
              provider: data.provider,
              externalEventId: data.externalEventId,
            },
          },
          create: data,
          update: {
            providerMessageId: data.providerMessageId,
            recipientEmail: data.recipientEmail,
            payloadHash: data.payloadHash,
            signatureVerified: true,
          },
        })
      }
    })
  } catch {
    return response('webhook_inbox_unavailable', 503)
  }

  return NextResponse.json({ received: true, acceptedEvents: normalized.events.length })
}
