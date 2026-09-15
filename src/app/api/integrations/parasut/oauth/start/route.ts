import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import { can } from '@/lib/policy'
import { assertParasutSameOrigin, createParasutAuthorizationCommand, readParasutOAuthConfig } from '@/lib/parasut-oauth-server'

export async function POST(req: NextRequest) {
  const ctx = await getSessionFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.manageIntegrations(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    assertParasutSameOrigin(req)
    const user = await db.user.findUnique({ where: { id: ctx.user.id }, select: { mfaEnabled: true } })
    if (!user?.mfaEnabled) return NextResponse.json({ error: 'Paraşüt bağlantısı için MFA gereklidir' }, { status: 403 })
    const config = readParasutOAuthConfig()
    const command = createParasutAuthorizationCommand({ workspaceId: ctx.workspace.id, userId: ctx.user.id, redirectUri: config.redirectUri, clientId: config.clientId })

    await db.$transaction(async tx => {
      await tx.parasutOAuthTransaction.updateMany({
        where: { workspaceId: ctx.workspace.id, userId: ctx.user.id, status: 'pending' },
        data: { status: 'expired' },
      })
      await tx.parasutOAuthTransaction.create({
        data: {
          workspaceId: command.transaction.workspaceId,
          userId: command.transaction.userId,
          stateHash: command.transaction.stateHash,
          bindingHash: command.transaction.bindingHash,
          redirectUri: command.transaction.redirectUri,
          status: command.transaction.status,
          expiresAt: command.transaction.expiresAt,
        },
      })
      await tx.auditLog.create({
        data: {
          workspaceId: ctx.workspace.id,
          actorId: ctx.user.id,
          action: 'parasut.oauth_started',
          resourceType: 'parasut_oauth_transaction',
          resourceId: command.transaction.stateHash,
          afterJson: JSON.stringify({ status: 'pending', expiresAt: command.transaction.expiresAt.toISOString() }),
        },
      })
    })

    return NextResponse.json({ authorizationUrl: command.authorizationUrl, expiresAt: command.transaction.expiresAt }, { status: 201, headers: { 'cache-control': 'no-store' } })
  } catch (error) {
    if (error instanceof Error && /origin|required|allowed/.test(error.message)) return NextResponse.json({ error: 'İstek kaynağı doğrulanamadı' }, { status: 403 })
    if (error instanceof Error && /configuration|redirect/.test(error.message)) return NextResponse.json({ error: 'Paraşüt OAuth yapılandırması hazır değil' }, { status: 503 })
    return NextResponse.json({ error: 'Paraşüt bağlantısı başlatılamadı' }, { status: 500 })
  }
}
