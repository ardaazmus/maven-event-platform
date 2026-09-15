import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createOrReusePaymentOrder } from '@/lib/payment-order-persistence'
import { buildPublicPaymentOrderSnapshot } from '@/lib/payment-public-intent'
import { authorizePublishedPaymentContext } from '@/lib/payment-published-context'
import { evaluatePaymentConnectionGate } from '@/lib/payment-connection-gate'
import { buildPublicPaymentStatusApiPath } from '@/lib/payment-status-key'
import { bindPaymentOrderToSubmission } from '@/lib/payment-submission-binding'
import { initializeHostedIyzicoCheckoutForStoredConnection } from '@/lib/iyzico-checkout-orchestration'
import { buildPublicPaymentCallbackUrl } from '@/lib/payment-callback-contract'
import { evaluateFirstPartyPaymentScope } from '@/lib/r10-scope-gate'
import { evaluatePublicFirstPartyPaymentProvider } from '@/lib/payment-business-model'

interface RouteParams {
  params: Promise<{ slug: string }>
}

function parseObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function paymentErrorStatus(reason: string): number {
  return ['payment_disabled', 'payment_invalid', 'context_invalid'].includes(reason) ? 503 : 400
}

function validSubmissionToken(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 255 && !/[\r\n]/.test(value)
}

// Public write-only payment intent: only published payment policy and an active
// private provider connection may create an internal PaymentOrder.
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params
  const form = await db.form.findFirst({
    where: { slug, deletedAt: null },
    select: {
      id: true,
      workspaceId: true,
      status: true,
      publishedVersionId: true,
      paymentConfig: {
        select: {
          provider: true,
          mode: true,
          connectionId: true,
          connection: { select: { id: true, workspaceId: true, provider: true, mode: true, status: true } },
        },
      },
    },
  })
  if (!form || form.status !== 'published' || !form.publishedVersionId) {
    return NextResponse.json({ error: 'Form bulunamadı veya yayında değil' }, { status: 404 })
  }

  const version = await db.formVersion.findUnique({
    where: { id: form.publishedVersionId },
    select: { id: true, formId: true, status: true, schemaJson: true },
  })
  const publishedContext = authorizePublishedPaymentContext({
    requestedFormId: form.id,
    requestedPublishedVersionId: form.publishedVersionId,
    form,
    version,
  })
  if (!publishedContext.ok) return NextResponse.json({ error: 'Form yayında değil' }, { status: 404 })

  let publishedSnapshot: Record<string, unknown>
  try {
    const parsed = parseObject(version?.schemaJson ? JSON.parse(version.schemaJson) : null)
    if (!parsed) throw new Error('invalid snapshot')
    publishedSnapshot = parsed
  } catch {
    return NextResponse.json({ error: 'Form yayında değil' }, { status: 404 })
  }

  const config = form.paymentConfig
  const payment = parseObject(publishedSnapshot.payment)
  const connection = config?.connection
  const connectionGate = evaluatePaymentConnectionGate({ workspaceId: form.workspaceId, payment, config, connection })
  const providerBinding = evaluatePublicFirstPartyPaymentProvider({
    provider: config?.provider,
    mode: config?.mode,
    connectionProvider: connection?.provider,
    connectionMode: connection?.mode,
  })
  const scopeGate = evaluateFirstPartyPaymentScope({
    scope: 'first_party',
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'local',
    workspaceId: form.workspaceId,
    merchantWorkspaceId: form.workspaceId,
  })
  if (!config || !payment || !connection || config.provider !== 'iyzico' || config.mode !== 'test' || !providerBinding.ok || config.connectionId !== connection.id || !connectionGate.ok || !scopeGate.ok) {
    return NextResponse.json({ error: 'Ödeme kullanılamıyor' }, { status: 503 })
  }

  let body: Record<string, unknown>
  try {
    if (Number(req.headers.get('content-length') || 0) > 100 * 1024) throw new Error('payload too large')
    const parsed = parseObject(await req.json())
    if (!parsed) throw new Error('invalid input')
    body = parsed
  } catch {
    return NextResponse.json({ error: 'Geçersiz ödeme verisi' }, { status: 400 })
  }

  const submissionToken = body.submissionToken === undefined ? null : body.submissionToken
  if (submissionToken !== null && !validSubmissionToken(submissionToken)) {
    return NextResponse.json({ error: 'Geçersiz form yanıtı' }, { status: 400 })
  }

  const idempotencyKey = req.headers.get('Idempotency-Key') || body.idempotencyKey
  const intent = buildPublicPaymentOrderSnapshot({
    workspaceId: form.workspaceId,
    formId: form.id,
    publishedVersionId: form.publishedVersionId,
    mode: config.mode,
    payment,
  }, { values: body.values, idempotencyKey })
  if (!intent.ok) return NextResponse.json({ error: 'Ödeme verisi geçersiz', code: intent.reason }, { status: paymentErrorStatus(intent.reason) })

  try {
    const persisted = await db.$transaction(async tx => {
      const submission = submissionToken
        ? await tx.submission.findFirst({ where: { formId: form.id, publicToken: submissionToken }, select: { id: true } })
        : null
      if (submissionToken && !submission) {
        const error = new Error('submission_not_found')
        const bindingError = error as Error & { code?: string }
        bindingError.code = 'PAYMENT_BINDING'
        throw error
      }

      const created = await createOrReusePaymentOrder(tx, intent.snapshot)
      if ('conflict' in created || !submission) return created

      if (!created.created && !created.order.submissionId) {
        const error = new Error('submission_binding_required')
        const bindingError = error as Error & { code?: string }
        bindingError.code = 'PAYMENT_BINDING'
        throw error
      }
      const binding = await bindPaymentOrderToSubmission(tx, {
        paymentOrderId: created.order.id,
        submissionId: submission.id,
        workspaceId: form.workspaceId,
        formId: form.id,
      })
      if (!binding.ok) {
        const error = new Error(binding.reason)
        const bindingError = error as Error & { code?: string }
        bindingError.code = 'PAYMENT_BINDING'
        throw error
      }
      return created
    })
    if ('conflict' in persisted) return NextResponse.json({ error: 'Idempotency anahtarı farklı ödeme için kullanıldı' }, { status: 409 })
    const statusPath = buildPublicPaymentStatusApiPath(persisted.order.publicKey)
    if (!statusPath) return NextResponse.json({ error: 'Ödeme durumu oluşturulamadı' }, { status: 503 })
    const { id: paymentOrderId } = persisted.order
    const callback = buildPublicPaymentCallbackUrl({
      appOrigin: process.env.MAVENFORMS_APP_ORIGIN?.trim() || req.nextUrl.origin,
      slug,
      mode: config.mode,
      publicKey: persisted.order.publicKey,
    })
    if (!callback.ok) return NextResponse.json({ error: 'Ödeme geri dönüşü yapılandırılamadı' }, { status: 503 })
    const checkout = await db.$transaction(tx => initializeHostedIyzicoCheckoutForStoredConnection({
      workspaceId: form.workspaceId,
      connectionId: config.connectionId,
      order: persisted.order,
      paymentOrderId,
      basketId: `basket_${intent.snapshot.idempotencyKey}`,
      productName: 'Form kaydı',
      callbackUrl: callback.callbackUrl,
      buyer: body.buyer,
      env: process.env,
      tx,
    }))
    if (!checkout.ok) return NextResponse.json({ error: 'Ödeme sayfası oluşturulamadı' }, { status: 503 })
    return NextResponse.json(
      { data: { status: checkout.status, reused: !persisted.created && checkout.reused, statusPath, checkoutUrl: checkout.redirectUrl } },
      { status: persisted.created ? 201 : 200, headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error: any) {
    if (error?.code === 'PAYMENT_BINDING') {
      return NextResponse.json({ error: error.message === 'submission_not_found' ? 'Form yanıtı bulunamadı' : 'Ödeme form yanıtına bağlanamadı', code: error.message }, { status: error.message === 'submission_not_found' ? 404 : 409 })
    }
    return NextResponse.json({ error: 'Ödeme başlatılamadı' }, { status: 503 })
  }
}
