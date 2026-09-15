import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getSessionFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'
import { can } from '@/lib/policy'
import { sendAdminVerificationEmail } from '@/lib/admin-verification-email'
import {
  DANGEROUS_CODE_MAX_ATTEMPTS,
  DANGEROUS_CODE_TTL_MS,
  confirmationPhrase,
  generateDangerousActionCode,
  hashDangerousActionCode,
  isDangerousAction,
  maskEmail,
  verifyDangerousActionCode,
} from '@/lib/dangerous-actions'

function emailIsConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD &&
      process.env.SMTP_FROM &&
      process.env.MAVENFORMS_DANGEROUS_ACTION_PEPPER,
  )
}

async function accountAdmin(req: NextRequest) {
  const ctx = await getSessionFromRequest(req)
  if (!ctx) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const permission = can.manageDangerousActions(ctx as any)
  if (!permission.allowed) return { error: NextResponse.json({ error: 'Bu işlem yalnızca hesap admini tarafından yapılabilir' }, { status: 403 }) }
  return { ctx }
}

export async function POST(req: NextRequest) {
  const auth = await accountAdmin(req)
  if (auth.error) return auth.error
  const body = await req.json().catch(() => null)
  const action = body?.action
  const intent = body?.intent
  if (!isDangerousAction(action)) return NextResponse.json({ error: 'Geçersiz tehlikeli işlem' }, { status: 400 })
  if (!emailIsConfigured()) return NextResponse.json({ error: 'Admin doğrulama e-postası yapılandırılmadan bu işlem kullanılamaz' }, { status: 503 })

  const ctx = auth.ctx!
  if (intent === 'request_code') {
    const limit = checkRateLimit(`dangerous-action:${ctx.workspace.id}:${ctx.user.id}:${action}`, 1, 60_000)
    if (!limit.allowed) return NextResponse.json({ error: 'Yeni doğrulama kodu için lütfen bekleyin' }, { status: 429 })
    const code = generateDangerousActionCode()
    const challengeId = randomUUID()
    const challenge = await db.dangerousActionChallenge.create({
      data: {
        id: challengeId,
        workspaceId: ctx.workspace.id,
        userId: ctx.user.id,
        action,
        codeHash: hashDangerousActionCode(challengeId, code),
        expiresAt: new Date(Date.now() + DANGEROUS_CODE_TTL_MS),
      },
    })
    try {
      await sendAdminVerificationEmail({ recipient: ctx.user.email, code, actionLabel: action === 'delete_workspace' ? 'workspace silme' : 'workspace arşivleme', expiresInMinutes: 10 })
    } catch {
      await db.dangerousActionChallenge.delete({ where: { id: challenge.id } })
      return NextResponse.json({ error: 'Admin doğrulama e-postası gönderilemedi; işlem güvenlik nedeniyle durduruldu' }, { status: 503 })
    }
    return NextResponse.json({ data: { challengeId: challenge.id, expiresAt: challenge.expiresAt, email: maskEmail(ctx.user.email), delivery: 'smtp_required' } })
  }

  if (intent !== 'confirm') return NextResponse.json({ error: 'Geçersiz doğrulama isteği' }, { status: 400 })
  const challengeId = typeof body.challengeId === 'string' ? body.challengeId : ''
  const code = typeof body.code === 'string' ? body.code : ''
  const confirmation = typeof body.confirmation === 'string' ? body.confirmation : ''
  if (!challengeId || confirmation !== confirmationPhrase(action)) return NextResponse.json({ error: `Onay alanına ${confirmationPhrase(action)} yazılmalıdır` }, { status: 400 })

  const result = await db.$transaction(async tx => {
    const challenge = await tx.dangerousActionChallenge.findFirst({ where: { id: challengeId, workspaceId: ctx.workspace.id, userId: ctx.user.id, action, consumedAt: null } })
    if (!challenge || challenge.expiresAt <= new Date()) return { error: 'Kod geçersiz veya süresi dolmuş', status: 401 as const }
    if (challenge.attemptCount >= DANGEROUS_CODE_MAX_ATTEMPTS) return { error: 'Çok fazla hatalı kod denemesi', status: 429 as const }
    const valid = verifyDangerousActionCode(challenge.id, code, challenge.codeHash)
    await tx.dangerousActionChallenge.update({ where: { id: challenge.id }, data: { attemptCount: { increment: 1 } } })
    if (!valid) return { error: 'Kod geçersiz veya süresi dolmuş', status: 401 as const }
    const consumed = await tx.dangerousActionChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: new Date() } })
    if (consumed.count !== 1) return { error: 'Doğrulama kodu daha önce kullanılmış', status: 409 as const }
    if (action === 'delete_workspace') {
      await tx.workspace.delete({ where: { id: ctx.workspace.id } })
    } else {
      await tx.form.updateMany({ where: { workspaceId: ctx.workspace.id, deletedAt: null }, data: { status: 'archived' } })
      await tx.workspace.update({ where: { id: ctx.workspace.id }, data: { status: 'archived' } })
    }
    return { success: true as const }
  })
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ data: { success: true, action } })
}
