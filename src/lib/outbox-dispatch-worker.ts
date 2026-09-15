import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import { sendOutboxMailchimpEmail } from '@/lib/outbox-mailchimp-dispatch'
import { claimOutboxEvents, completeOutboxEmailAccepted, completeOutboxEvent } from '@/lib/outbox-worker'
import { classifyInvoiceDeliveryFailure } from '@/lib/invoice-delivery-retry'

const MAX_BATCH_SIZE = 50

export type OutboxDispatchWorkerResult = {
  claimed: number
  accepted: number
  rejected: number
  failed: number
}

function safeErrorCode(error: unknown) {
  return error instanceof Error && /^[a-z0-9_]{1,80}$/.test(error.message) ? error.message : 'email_dispatch_failed'
}

async function completeInvoiceDeliveryFailure(id: string, code: string, attemptCount: number) {
  // Provider rejection is classified as 'permanent' by the shared failure policy.
  const decision = classifyInvoiceDeliveryFailure({ code, attemptCount })
  return completeOutboxEvent(id, false, decision.code, decision.failureKind)
}

/** Claims and dispatches durable email outbox work without exposing provider details. */
export async function runOutboxDispatchWorkerOnce(limit = 10, workerId = `email-dispatch-${randomUUID()}`): Promise<OutboxDispatchWorkerResult> {
  if (!Number.isSafeInteger(limit) || limit <= 0 || limit > MAX_BATCH_SIZE) throw new Error('invalid_dispatch_batch')
  const claimed = await claimOutboxEvents(limit, workerId, 'email')
  const events = await db.outboxEvent.findMany({
    where: { status: 'sending', lockedBy: workerId },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })
  let accepted = 0
  let rejected = 0
  let failed = 0

  for (const event of events) {
    if (event.type !== 'email' || !event.queueClass) {
      await completeInvoiceDeliveryFailure(event.id, 'dispatch_payload_invalid', event.attemptCount)
      rejected += 1
      continue
    }

    const connection = await db.emailProviderConnection.findUnique({
      where: { workspaceId_provider: { workspaceId: event.workspaceId, provider: 'mailchimp_transactional' } },
      select: { id: true, workspaceId: true, provider: true, status: true, publicConfigJson: true, credentialsEnvelope: true },
    })
    if (!connection) {
      await completeInvoiceDeliveryFailure(event.id, 'provider_connection_missing', event.attemptCount)
      failed += 1
      continue
    }

    try {
      const result = await sendOutboxMailchimpEmail({
        outboxEvent: event,
        connection,
        env: process.env,
      })
      if (!('sendStatus' in result)) {
        await completeInvoiceDeliveryFailure(event.id, `dispatch_${result.reason}`, event.attemptCount)
        failed += 1
        continue
      }
      if (result.sendStatus === 'rejected') {
        await completeInvoiceDeliveryFailure(event.id, `provider_${result.reason}`, event.attemptCount)
        rejected += 1
        continue
      }

      await completeOutboxEmailAccepted(event.id, {
        provider: 'mailchimp_transactional',
        providerMessageId: result.providerMessageId,
        acceptedAt: new Date(),
      })
      accepted += 1
    } catch (error) {
      await completeInvoiceDeliveryFailure(event.id, safeErrorCode(error), event.attemptCount)
      failed += 1
    }
  }

  return { claimed, accepted, rejected, failed }
}
