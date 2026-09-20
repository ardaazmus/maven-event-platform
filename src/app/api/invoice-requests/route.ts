import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { encryptInvoicePii } from '@/lib/invoice-pii-crypto'

const requestSchema = z.object({
  orderId: z.string().min(1).optional().nullable(),
  recipientType: z.enum(['individual', 'corporate']),
  legalName: z.string().min(1).max(200),
  taxNumber: z.string().max(20).optional().nullable(),
  taxOffice: z.string().max(100).optional().nullable(),
  identityNumber: z.string().max(20).optional().nullable(),
  email: z.string().email().max(200).optional().nullable(),
  billingAddress: z.string().max(1000).optional().nullable(),
})

// PII handling: AES-256-GCM when MAVENFORMS_INVOICE_PII_KEY is set;
// non-production dev fallback stores explicit `plain:`-marked values, never raw.
// Production without key fails closed (503).
function protect(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null
  if (process.env.MAVENFORMS_INVOICE_PII_KEY) return encryptInvoicePii(value)
  if (process.env.NODE_ENV === 'production') throw Object.assign(new Error('Invoice security not configured'), { status: 503 })
  return `plain:${value}`
}

export async function GET() {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.readInvoices(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  // PII-safe inbox: sifreli alanlar ve e-posta asla listelenmez.
  const rows = await db.invoiceRequest.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id: true, orderId: true, recipientType: true, countryCode: true, status: true, createdAt: true },
  })

  return NextResponse.json({ data: rows })
}

export async function POST(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writeInvoices(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const body = await req.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
  }

  // Recipient validation gates (F3-3.1)
  if (parsed.data.recipientType === 'corporate' && !parsed.data.taxNumber) {
    return NextResponse.json({ error: 'Corporate requires taxNumber' }, { status: 400 })
  }
  if (parsed.data.recipientType === 'individual' && !parsed.data.identityNumber) {
    return NextResponse.json({ error: 'Individual requires identityNumber' }, { status: 400 })
  }

  let orderSnapshot = '[]'
  if (parsed.data.orderId) {
    const order = await db.order.findFirst({
      where: { id: parsed.data.orderId, workspaceId: ctx.workspace.id },
      include: { items: true },
    })
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    orderSnapshot = JSON.stringify(order.items.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unitAmountMinor: it.unitAmountMinor,
      taxAmountMinor: it.taxAmountMinor,
      discountAmountMinor: it.discountAmountMinor,
      currency: it.currency,
    })))
  }

  let stored: any
  try {
    stored = await db.invoiceRequest.create({
      data: {
        workspaceId: ctx.workspace.id,
        orderId: parsed.data.orderId ?? null,
        recipientType: parsed.data.recipientType,
        legalNameEncrypted: protect(parsed.data.legalName),
        taxNumberEncrypted: protect(parsed.data.taxNumber),
        taxOfficeEncrypted: protect(parsed.data.taxOffice),
        identityNumberEncrypted: protect(parsed.data.identityNumber),
        emailEncrypted: protect(parsed.data.email),
        billingAddressEncrypted: protect(parsed.data.billingAddress),
        lineSnapshotJson: orderSnapshot,
        status: 'requested',
        requestedById: ctx.user.id,
      },
    })
  } catch (e: any) {
    if (e?.status === 503) return NextResponse.json({ error: e.message }, { status: 503 })
    throw e
  }

  // Never echo PII back
  return NextResponse.json({ data: { id: stored.id, status: stored.status } }, { status: 201 })
}
