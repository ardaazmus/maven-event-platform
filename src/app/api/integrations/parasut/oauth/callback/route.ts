import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { buildParasutTokenExchangeRequest, consumeParasutOAuthState, parseParasutTokenResponse } from '@/lib/parasut-oauth'
import { encryptParasutCredential } from '@/lib/parasut-credentials'
import { readParasutOAuthConfig, safeParasutResultUrl } from '@/lib/parasut-oauth-server'

function stateHash(state: string): string {
  return createHash('sha256').update(state, 'utf8').digest('hex')
}

function redirect(redirectUri: string, result: 'connected' | 'error') {
  return NextResponse.redirect(safeParasutResultUrl(redirectUri, result), { status: 303, headers: { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } })
}

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get('state')
  if (!state) return NextResponse.json({ error: 'OAuth state eksik' }, { status: 400 })
  const transaction = await db.parasutOAuthTransaction.findUnique({ where: { stateHash: stateHash(state) } })
  if (!transaction) return NextResponse.json({ error: 'OAuth state geçersiz' }, { status: 400 })

  let stateResult
  try {
    stateResult = consumeParasutOAuthState({ ...transaction, status: transaction.status as 'pending' | 'consumed' | 'failed' | 'expired' }, state)
  } catch {
    return NextResponse.json({ error: 'OAuth işlemi geçersiz veya süresi dolmuş' }, { status: 409 })
  }
  const consumed = await db.parasutOAuthTransaction.updateMany({
    where: { id: transaction.id, status: 'pending', expiresAt: { gt: new Date() } },
    data: stateResult,
  })
  if (consumed.count !== 1) return NextResponse.json({ error: 'OAuth işlemi kullanılmış veya süresi dolmuş' }, { status: 409 })

  if (req.nextUrl.searchParams.get('error') || !req.nextUrl.searchParams.get('code')) {
    await db.parasutOAuthTransaction.update({ where: { id: transaction.id }, data: { status: 'failed' } })
    return redirect(transaction.redirectUri, 'error')
  }

  try {
    const config = readParasutOAuthConfig()
    const request = buildParasutTokenExchangeRequest({ code: req.nextUrl.searchParams.get('code') || undefined, clientId: config.clientId, clientSecret: config.clientSecret, redirectUri: transaction.redirectUri })
    const response = await fetch(request.url, { method: request.method, headers: request.headers, body: request.body })
    if (!response.ok) throw new Error('provider token exchange failed')
    const tokenSet = parseParasutTokenResponse(await response.json())
    const credentialsEnvelope = encryptParasutCredential(JSON.stringify({ accessToken: tokenSet.accessToken, refreshToken: tokenSet.refreshToken, accessTokenExpiresAt: new Date(Date.now() + tokenSet.expiresInSeconds * 1000).toISOString() }))

    await db.$transaction(async tx => {
      await tx.parasutConnection.upsert({
        where: { workspaceId: transaction.workspaceId },
        create: { workspaceId: transaction.workspaceId, credentialsEnvelope, credentialKeyId: process.env.MAVENFORMS_PARASUT_ENCRYPTION_KEY_ID || 'v1', status: 'connected_pending_company' },
        update: { credentialsEnvelope, credentialKeyId: process.env.MAVENFORMS_PARASUT_ENCRYPTION_KEY_ID || 'v1', status: 'connected_pending_company', lastVerifiedAt: null },
      })
      await tx.auditLog.create({
        data: { workspaceId: transaction.workspaceId, actorId: transaction.userId, action: 'parasut.oauth_connected', resourceType: 'parasut_connection', resourceId: transaction.workspaceId, afterJson: JSON.stringify({ status: 'connected_pending_company' }) },
      })
    })
    return redirect(transaction.redirectUri, 'connected')
  } catch {
    await db.$transaction([
      db.parasutOAuthTransaction.update({ where: { id: transaction.id }, data: { status: 'failed' } }),
      db.auditLog.create({ data: { workspaceId: transaction.workspaceId, actorId: transaction.userId, action: 'parasut.oauth_failed', resourceType: 'parasut_oauth_transaction', resourceId: transaction.id, afterJson: JSON.stringify({ status: 'failed' }) } }),
    ])
    return redirect(transaction.redirectUri, 'error')
  }
}
