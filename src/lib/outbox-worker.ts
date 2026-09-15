import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { emailQueuePriority, normalizeEmailQueueClass } from '@/lib/email-queue'
import type { EmailMessageClass } from '@/lib/email-policy'
import { evaluateQueuedEmailDelivery, extractQueuedEmailRecipient } from '@/lib/email-delivery-guard'
import { hashRecipientEmail } from '@/lib/email-recipient-hash'
import { buildProviderAcceptedOutboxData, type ProviderAcceptedOutboxInput } from '@/lib/outbox-provider-acceptance'
import type { SubmissionEmailIntent } from '@/lib/submission-email-intents'

type SubmissionOutboxInput = {
  workspaceId: string
  formId: string
  submissionId: string
  payload?: Record<string, unknown>
  emailMessageClass?: EmailMessageClass
  emailIntents?: SubmissionEmailIntent[]
}

/**
 * Persists downstream delivery events in the same transaction as a submission.
 * The caller must pass Prisma's transaction client so a durable submission can
 * never be acknowledged without its delivery intents.
 */
export async function enqueueSubmissionOutbox(tx: Prisma.TransactionClient, input: SubmissionOutboxInput) {
  const basePayload = input.payload ?? { formId: input.formId, submissionId: input.submissionId }
  const emailPayloads = input.emailIntents === undefined
    ? [basePayload]
    : input.emailIntents.map(intent => ({ ...basePayload, ...intent }))
  return tx.outboxEvent.createMany({
    data: [
      ...emailPayloads.map(payload => ({
        workspaceId: input.workspaceId,
        formId: input.formId,
        submissionId: input.submissionId,
        type: 'email',
        queueClass: normalizeEmailQueueClass(input.emailMessageClass || 'notification'),
        priority: emailQueuePriority(input.emailMessageClass || 'notification'),
        payloadJson: JSON.stringify(payload),
      })),
      {
        workspaceId: input.workspaceId,
        formId: input.formId,
        submissionId: input.submissionId,
        type: 'webhook',
        queueClass: null,
        priority: 0,
        payloadJson: JSON.stringify(basePayload),
      },
    ],
  })
}

export function rateLimitDeferData(retryAt: number, nowMs = Date.now()) {
  if (!Number.isSafeInteger(retryAt) || retryAt <= nowMs) throw new Error('retry time must be in the future')
  return { status: 'queued' as const, availableAt: new Date(retryAt), lastError: 'email_rate_limited', lockedBy: null, lockedUntil: null }
}

/** Returns rate-limited work to the queue without deleting its delivery intent. */
export async function deferOutboxEventForRateLimit(id: string, retryAt: number) {
  return db.outboxEvent.update({ where: { id }, data: rateLimitDeferData(retryAt) })
}

// M10.3 — claim lease + backoff + dead-letter, idempotent
export async function claimOutboxEvents(limit = 10, workerId = 'worker-1', eventType: 'email' | 'webhook' | 'all' = 'all') {
  const now = new Date()
  const events = await db.outboxEvent.findMany({
    where: {
      type: eventType === 'all' ? undefined : eventType,
      // A crashed worker can leave a record in sending until its lease expires.
      // Include that state so restart recovery can reclaim it; the CAS below
      // still prevents two workers from owning the same lease.
      status: { in: ['queued', 'failed', 'sending'] },
      availableAt: { lte: now },
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    take: limit,
  })
  const claimed: string[] = []
  for (const ev of events) {
    const res = await db.outboxEvent.updateMany({
      where: { id: ev.id, status: { in: ['queued', 'failed', 'sending'] }, OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] },
      data: { status: 'sending', lockedBy: workerId, lockedUntil: new Date(Date.now() + 30_000), attemptCount: { increment: 1 } },
    })
    if (res.count !== 1) continue

    if (ev.type === 'email' && ev.queueClass) {
      let recipientEmail: string | null
      try {
        recipientEmail = extractQueuedEmailRecipient(ev.payloadJson)
      } catch (error) {
        await db.outboxEvent.update({ where: { id: ev.id }, data: { status: 'dead', lastError: error instanceof Error ? error.message : 'queued_email_payload_invalid', lockedBy: null, lockedUntil: null } })
        continue
      }

      if (recipientEmail) {
        const hashSecret = process.env.MAVENFORMS_EMAIL_UNSUBSCRIBE_SECRET || ''
        if (!hashSecret) {
          await db.outboxEvent.update({ where: { id: ev.id }, data: { status: 'failed', lastError: 'suppression_hash_secret_required', lockedBy: null, lockedUntil: null } })
          continue
        }
        const recipientHash = hashRecipientEmail(recipientEmail, hashSecret)
        const [suppressions, protection] = await Promise.all([
          db.emailSuppression.findMany({ where: { workspaceId: ev.workspaceId, recipientHash }, select: { scope: true } }),
          ev.queueClass === 'marketing' ? db.workspaceEmailProtection.findUnique({ where: { workspaceId: ev.workspaceId }, select: { marketingPaused: true } }) : Promise.resolve(null),
        ])
        const delivery = evaluateQueuedEmailDelivery({
          messageClass: normalizeEmailQueueClass(ev.queueClass),
          suppressionScopes: suppressions.map(suppression => suppression.scope as 'all' | 'marketing'),
          marketingPaused: protection?.marketingPaused === true,
        })
        if (delivery.status === 'blocked') {
          await db.outboxEvent.update({ where: { id: ev.id }, data: { status: 'dead', lastError: `email_${delivery.reason}`, lockedBy: null, lockedUntil: null } })
          continue
        }
      }
    }

    claimed.push(ev.id)
  }
  return claimed.length
}

export async function completeOutboxEvent(id: string, ok: boolean, error?: string, failureKind: 'retryable' | 'permanent' = 'retryable') {
  if (ok) return db.outboxEvent.update({ where: { id }, data: { status: 'sent', sentAt: new Date(), lockedBy: null, lockedUntil: null } })
  const ev = await db.outboxEvent.findUnique({ where: { id } })
  const attempts = (ev?.attemptCount || 0)
  const isDead = failureKind === 'permanent' || attempts >= 5
  return db.outboxEvent.update({
    where: { id },
    data: {
      status: isDead ? 'dead' : 'failed',
      lastError: error?.slice(0,500),
      availableAt: isDead ? undefined : new Date(Date.now() + Math.pow(2, attempts) * 1000),
      lockedBy: null,
      lockedUntil: null,
    },
  })
}

/** Marks an email accepted by its provider and retains the correlation identity. */
export async function completeOutboxEmailAccepted(id: string, input: ProviderAcceptedOutboxInput) {
  return db.outboxEvent.update({ where: { id }, data: buildProviderAcceptedOutboxData(input) })
}
