import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { encryptPaymentCredential } from '@/lib/payment-credentials'
import { sanitizePaymentProviderPublicConfig } from '@/lib/payment-provider-public-config'
import { resolveAppEnvironment } from '@/lib/env'
import { evaluateR10LiveMutation } from '@/lib/r10-scope-gate'

const providerSchema = z.enum(['stripe', 'iyzico'])
const modeSchema = z.enum(['test', 'live'])

const createConnectionSchema = z.object({
  provider: providerSchema,
  mode: modeSchema.default('test'),
  displayName: z.string().trim().min(1).max(100),
  publicConfig: z.object({
    publishableKey: z.string().trim().max(255).optional(),
    merchantId: z.string().trim().max(255).optional(),
    accountId: z.string().trim().max(255).optional(),
  }).strict().default({}),
  credentials: z.object({
    apiKey: z.string().min(1).max(500).optional(),
    secretKey: z.string().min(1).max(500).optional(),
    webhookSecret: z.string().min(1).max(500).optional(),
  }).strict(),
}).superRefine((value, ctx) => {
  const keys = Object.keys(value.credentials)
  if (keys.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['credentials'], message: 'En az bir server credential gereklidir' })
  }

  if (value.provider === 'stripe' && (!value.credentials.apiKey || !value.credentials.webhookSecret)) {
    ctx.addIssue({ code: 'custom', path: ['credentials'], message: 'Stripe için API key ve webhook secret gereklidir' })
  }

  if (value.provider === 'iyzico' && (!value.credentials.apiKey || !value.credentials.secretKey)) {
    ctx.addIssue({ code: 'custom', path: ['credentials'], message: 'iyzico için API key ve secret key gereklidir' })
  }
})

function publicConnection(connection: {
  id: string
  provider: string
  mode: string
  displayName: string
  publicConfigJson: string
  credentialsEnvelope: string | null
  credentialKeyId: string | null
  status: string
  lastVerifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
}) {
  let publicConfig: Record<string, string> = {}
  try {
    publicConfig = sanitizePaymentProviderPublicConfig(JSON.parse(connection.publicConfigJson || '{}'))
  } catch {
    publicConfig = {}
  }

  return {
    id: connection.id,
    provider: connection.provider,
    mode: connection.mode,
    displayName: connection.displayName,
    publicConfig,
    hasCredentials: Boolean(connection.credentialsEnvelope),
    credentialKeyId: connection.credentialKeyId ? 'configured' : null,
    status: connection.status,
    lastVerifiedAt: connection.lastVerifiedAt,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
  }
}

export async function GET() {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.manageIntegrations(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const connections = await db.paymentProviderConnection.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ data: connections.map(publicConnection) })
}

export async function POST(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.manageIntegrations(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const parsed = createConnectionSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: 'Geçersiz provider bağlantı bilgisi' }, { status: 400 })
    if (parsed.data.mode === 'live' && process.env.PAYMENT_LIVE_ENABLED !== 'true') {
      return NextResponse.json({ error: 'Canlı ödeme bağlantısı release güvenlik kapısı açılmadan kullanılamaz' }, { status: 403 })
    }
    const liveGuard = evaluateR10LiveMutation({
      environment: resolveAppEnvironment(),
      operation: parsed.data.mode === 'live' ? 'live' : 'sandbox',
      liveSecretProvided: parsed.data.mode === 'live',
      productionR10Evidence: process.env.MAVENFORMS_R10_PRODUCTION_EVIDENCE === 'true',
    })
    if (!liveGuard.allowed) return NextResponse.json({ error: 'Provider bağlantısı güvenlik kapısından geçmedi' }, { status: 403 })

    const existing = await db.paymentProviderConnection.findUnique({
      where: {
        workspaceId_provider_mode: {
          workspaceId: ctx.workspace.id,
          provider: parsed.data.provider,
          mode: parsed.data.mode,
        },
      },
    })
    if (existing) return NextResponse.json({ error: 'Bu provider ve mod için bağlantı zaten mevcut' }, { status: 409 })

    const credentialsEnvelope = encryptPaymentCredential(JSON.stringify(parsed.data.credentials))
    const connection = await db.paymentProviderConnection.create({
      data: {
        workspaceId: ctx.workspace.id,
        provider: parsed.data.provider,
        mode: parsed.data.mode,
        displayName: parsed.data.displayName,
        publicConfigJson: JSON.stringify(parsed.data.publicConfig),
        credentialsEnvelope,
        credentialKeyId: process.env.MAVENFORMS_PAYMENT_ENCRYPTION_KEY_ID || 'v1',
        status: 'pending_verification',
      },
    })

    await db.auditLog.create({
      data: {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        action: 'payment_provider_connection.create',
        resourceType: 'payment_provider_connection',
        resourceId: connection.id,
        beforeJson: null,
        afterJson: JSON.stringify({ provider: connection.provider, mode: connection.mode, status: connection.status }),
      },
    })

    return NextResponse.json({ data: publicConnection(connection) }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('MAVENFORMS_PAYMENT_ENCRYPTION_KEY')) {
      return NextResponse.json({ error: 'Ödeme secret güvenliği yapılandırılmadan provider bağlantısı açılamaz' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Provider bağlantısı oluşturulamadı' }, { status: 500 })
  }
}
