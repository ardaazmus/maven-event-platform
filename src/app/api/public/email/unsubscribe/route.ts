import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyMarketingUnsubscribeToken } from '@/lib/email-unsubscribe-token'

/** Applies an authenticated marketing opt-out without exposing recipient PII. */
export async function POST(req: NextRequest) {
  const secret = process.env.MAVENFORMS_EMAIL_UNSUBSCRIBE_SECRET
  if (!secret) return NextResponse.json({ error: 'Unsubscribe güvenliği yapılandırılmamış' }, { status: 503 })

  const token = new URL(req.url).searchParams.get('token')
  const payload = token ? verifyMarketingUnsubscribeToken(token, secret, Date.now()) : null
  if (!payload) return NextResponse.json({ error: 'Geçersiz veya süresi dolmuş bağlantı' }, { status: 404 })

  await db.emailPreference.upsert({
    where: { workspaceId_recipientHash: { workspaceId: payload.workspaceId, recipientHash: payload.recipientHash } },
    create: { workspaceId: payload.workspaceId, recipientHash: payload.recipientHash, marketingOptOut: true },
    update: { marketingOptOut: true },
  })
  return NextResponse.json({ data: { unsubscribed: true, scope: 'marketing' } })
}
