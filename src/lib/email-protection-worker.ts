import { db } from '@/lib/db'
import { normalizeEmailProviderEvent, type EmailProviderEvent } from '@/lib/email-provider-event'
import { hashRecipientEmail } from '@/lib/email-recipient-hash'
import { decideEmailProtection, type EmailProtectionDecision } from '@/lib/email-protection'
import { nextEmailDeliveryStatus } from '@/lib/email-delivery-correlation'

type EmailProtectionPersistenceInput = {
  workspaceId: string
  eventId: string
  event: EmailProviderEvent
  decision: EmailProtectionDecision
}

export type EmailProtectionPersistencePlan = {
  suppression: {
    workspaceId: string
    recipientHash: string
    reason: string
    scope: string
    sourceProvider: string
    sourceEventId: string
  } | null
  workspaceProtection: {
    workspaceId: string
    marketingPaused: true
    pauseReason: 'complaint'
  } | null
  audit: {
    action: 'email.protection.alert'
    resourceType: 'email_provider_event'
    resourceId: string
    afterJson: string
  } | null
}

/** Builds only the non-PII database payload for one verified protection decision. */
export function buildEmailProtectionPersistencePlan(
  input: EmailProtectionPersistenceInput,
  hashSecret: string,
): EmailProtectionPersistencePlan {
  const suppression = input.decision.suppression
    ? {
        workspaceId: input.workspaceId,
        recipientHash: hashRecipientEmail(input.decision.suppression.email, hashSecret),
        reason: input.decision.suppression.reason,
        scope: input.decision.suppression.scope,
        sourceProvider: input.event.provider,
        sourceEventId: input.event.externalEventId,
      }
    : null
  const workspaceProtection = input.decision.pauseMarketing
    ? { workspaceId: input.workspaceId, marketingPaused: true as const, pauseReason: 'complaint' as const }
    : null
  const audit = input.decision.adminAlert
    ? {
        action: 'email.protection.alert' as const,
        resourceType: 'email_provider_event' as const,
        resourceId: input.eventId,
        afterJson: JSON.stringify({ alert: input.decision.adminAlert, eventType: input.event.eventType }),
      }
    : null
  return { suppression, workspaceProtection, audit }
}

export type EmailProtectionWorkerResult =
  | { status: 'processed'; eventId: string; suppression: boolean; marketingPaused: boolean; adminAlert: string | null }
  | { status: 'ignored'; eventId: string; reason: 'signature_not_verified' | 'unsupported_event' | 'recipient_missing' }
  | { status: 'failed'; eventId: string; reason: 'suppression_hash_secret_required' }
  | { status: 'not_found'; eventId: string }
  | { status: 'already_processed'; eventId: string; processingStatus?: string }

function clearLease() {
  return { lockedBy: null, lockedUntil: null }
}

function failureCode(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 100) : 'email_protection_failed'
}

export async function claimEmailProviderEvents(limit = 10, workerId = 'email-protection-worker'): Promise<string[]> {
  const now = new Date()
  const events = await db.emailProviderEvent.findMany({
    where: {
      OR: [
        { processingStatus: { in: ['received', 'failed'] } },
        { processingStatus: 'processing', lockedUntil: { lt: now } },
      ],
    },
    orderBy: { receivedAt: 'asc' },
    take: limit,
    select: { id: true },
  })
  const claimed: string[] = []
  for (const event of events) {
    const result = await db.emailProviderEvent.updateMany({
      where: {
        id: event.id,
        OR: [
          { processingStatus: { in: ['received', 'failed'] } },
          { processingStatus: 'processing', lockedUntil: { lt: now } },
        ],
      },
      data: { processingStatus: 'processing', attemptCount: { increment: 1 }, lockedBy: workerId, lockedUntil: new Date(Date.now() + 30_000) },
    })
    if (result.count === 1) claimed.push(event.id)
  }
  return claimed
}

/** Applies one claimed email provider event atomically and idempotently. */
export async function processEmailProviderEvent(eventId: string, workerId = 'email-protection-worker'): Promise<EmailProtectionWorkerResult> {
  return db.$transaction(async tx => {
    const stored = await tx.emailProviderEvent.findUnique({ where: { id: eventId } })
    if (!stored) return { status: 'not_found', eventId }
    if (stored.processingStatus === 'processing' && stored.lockedBy !== workerId) return { status: 'already_processed', eventId, processingStatus: stored.processingStatus }
    if (!['received', 'failed', 'processing'].includes(stored.processingStatus)) return { status: 'already_processed', eventId, processingStatus: stored.processingStatus }

    if (stored.processingStatus !== 'processing') {
      const claim = await tx.emailProviderEvent.updateMany({
        where: { id: stored.id, processingStatus: stored.processingStatus },
        data: { processingStatus: 'processing', attemptCount: { increment: 1 }, lockedBy: workerId, lockedUntil: new Date(Date.now() + 30_000) },
      })
      if (claim.count !== 1) return { status: 'already_processed', eventId, processingStatus: 'processing' }
    }

    let normalized: EmailProviderEvent
    try {
      normalized = normalizeEmailProviderEvent({
        provider: stored.provider,
        externalEventId: stored.externalEventId,
        eventType: stored.eventType,
        providerMessageId: stored.providerMessageId,
        recipientEmail: stored.recipientEmail,
        payloadHash: stored.payloadHash,
        signatureVerified: stored.signatureVerified,
      })
    } catch (error) {
      const reason = error instanceof Error && error.message.includes('signature') ? 'signature_not_verified' : 'unsupported_event'
      await tx.emailProviderEvent.update({ where: { id: stored.id }, data: { ...clearLease(), processingStatus: 'ignored', failureCode: failureCode(error), processedAt: new Date() } })
      return { status: 'ignored', eventId, reason }
    }

    if (normalized.providerMessageId) {
      const outboxEvents = await tx.outboxEvent.findMany({
        where: {
          workspaceId: stored.workspaceId,
          type: 'email',
          status: 'sent',
          provider: normalized.provider,
          providerMessageId: normalized.providerMessageId,
        },
        select: { id: true, deliveryStatus: true },
      })
      for (const outboxEvent of outboxEvents) {
        const deliveryStatus = nextEmailDeliveryStatus(outboxEvent.deliveryStatus, normalized.eventType)
        if (!deliveryStatus || deliveryStatus === outboxEvent.deliveryStatus) continue
        await tx.outboxEvent.updateMany({
          where: { id: outboxEvent.id, workspaceId: stored.workspaceId, deliveryStatus: outboxEvent.deliveryStatus },
          data: { deliveryStatus },
        })
      }
    }

    let plan: EmailProtectionPersistencePlan
    try {
      plan = buildEmailProtectionPersistencePlan({ workspaceId: stored.workspaceId, eventId: stored.id, event: normalized, decision: decideEmailProtection(normalized) }, process.env.MAVENFORMS_EMAIL_UNSUBSCRIBE_SECRET || '')
    } catch (error) {
      await tx.emailProviderEvent.update({ where: { id: stored.id }, data: { ...clearLease(), processingStatus: 'failed', failureCode: failureCode(error) } })
      return { status: 'failed', eventId, reason: 'suppression_hash_secret_required' }
    }

    if (plan.suppression) {
      await tx.emailSuppression.upsert({
        where: { workspaceId_recipientHash_scope: { workspaceId: plan.suppression.workspaceId, recipientHash: plan.suppression.recipientHash, scope: plan.suppression.scope } },
        create: plan.suppression,
        update: { reason: plan.suppression.reason, sourceProvider: plan.suppression.sourceProvider, sourceEventId: plan.suppression.sourceEventId },
      })
    }
    if (plan.workspaceProtection) {
      await tx.workspaceEmailProtection.upsert({
        where: { workspaceId: plan.workspaceProtection.workspaceId },
        create: { ...plan.workspaceProtection, pausedAt: new Date() },
        update: { marketingPaused: true, pauseReason: plan.workspaceProtection.pauseReason, pausedAt: new Date() },
      })
    }
    if (plan.audit) await tx.auditLog.create({ data: { workspaceId: stored.workspaceId, action: plan.audit.action, resourceType: plan.audit.resourceType, resourceId: plan.audit.resourceId, afterJson: plan.audit.afterJson } })
    await tx.emailProviderEvent.update({ where: { id: stored.id }, data: { ...clearLease(), processingStatus: 'processed', processedAt: new Date(), failureCode: null } })
    return { status: 'processed', eventId, suppression: Boolean(plan.suppression), marketingPaused: Boolean(plan.workspaceProtection), adminAlert: plan.audit ? JSON.parse(plan.audit.afterJson).alert : null }
  })
}

export async function runEmailProtectionWorkerOnce(limit = 10, workerId = `email-protection-worker-${Date.now()}`) {
  const eventIds = await claimEmailProviderEvents(limit, workerId)
  const results: EmailProtectionWorkerResult[] = []
  for (const eventId of eventIds) results.push(await processEmailProviderEvent(eventId, workerId))
  return { claimed: eventIds.length, results }
}
