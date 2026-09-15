import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

export async function GET() {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.manageIntegrations(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const integrations = await db.integration.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { createdAt: 'asc' },
  })

  // ponytail: gerçek credential yoksa "connected" gösterme — M07.2
  const hasRealCreds = !!process.env.SMTP_HOST || !!process.env.STRIPE_SECRET
  return NextResponse.json({
    data: integrations.map(i => {
      const cfg = JSON.parse(i.configJson || '{}')
      const status = hasRealCreds ? i.status : 'disconnected'
      // redacted: never leak secrets
      const redactedCfg = { ...cfg }
      for (const k of ['secret','apiKey','password','token']) if (k in redactedCfg) redactedCfg[k]='***'
      return { id: i.id, provider: i.provider, name: i.name, status, config: redactedCfg, createdAt: i.createdAt, updatedAt: i.updatedAt }
    }),
  })
}
