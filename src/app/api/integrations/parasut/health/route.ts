import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import { can } from '@/lib/policy'
import { assertParasutSameOrigin } from '@/lib/parasut-oauth-server'
import { decryptParasutCredential } from '@/lib/parasut-credentials'
import { evaluateParasutHealth } from '@/lib/parasut-health'
import { parasutHealthClient, type ParasutCompanyRef } from '@/lib/providers/parasut-health-client'

type ParasutTokenSet = { accessToken: string; refreshToken: string; accessTokenExpiresAt: string }

function parseTokenSet(value: string): ParasutTokenSet {
  const parsed: unknown = JSON.parse(value)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid token set')
  const tokenSet = parsed as Record<string, unknown>
  if (typeof tokenSet.accessToken !== 'string' || !tokenSet.accessToken || typeof tokenSet.refreshToken !== 'string' || !tokenSet.refreshToken || typeof tokenSet.accessTokenExpiresAt !== 'string') throw new Error('invalid token set')
  const expiresAt = new Date(tokenSet.accessTokenExpiresAt)
  if (!Number.isFinite(expiresAt.getTime())) throw new Error('invalid token expiry')
  return { accessToken: tokenSet.accessToken, refreshToken: tokenSet.refreshToken, accessTokenExpiresAt: expiresAt.toISOString() }
}

function response(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } })
}

function failureStatus(status: string): 409 | 503 {
  return status === 'health_check_retryable' ? 503 : 409
}

function publicCompanies(companies: ParasutCompanyRef[]) {
  return companies.map(company => ({ id: company.id, name: company.name }))
}

/** Checks and, only after successful provider scope verification, activates a Paraşüt connection. */
export async function POST(req: NextRequest) {
  const ctx = await getSessionFromRequest(req)
  if (!ctx) return response({ error: 'Unauthorized' }, 401)
  const permission = can.manageIntegrations(ctx as any)
  if (!permission.allowed) return response({ error: permission.error }, permission.status)

  try {
    assertParasutSameOrigin(req)
    const user = await db.user.findUnique({ where: { id: ctx.user.id }, select: { mfaEnabled: true } })
    if (!user?.mfaEnabled) return response({ error: 'Paraşüt sağlık kontrolü için MFA gereklidir' }, 403)

    const connection = await db.parasutConnection.findUnique({ where: { workspaceId: ctx.workspace.id } })
    if (!connection) return response({ error: 'Paraşüt bağlantısı bulunamadı', status: 'not_connected', canUse: false }, 404)
    if (!connection.credentialsEnvelope) return response({ error: 'Paraşüt yeniden yetkilendirme gerektiriyor', status: 'reauthorization_required', canUse: false }, 409)

    let tokenSet: ParasutTokenSet
    try {
      tokenSet = parseTokenSet(decryptParasutCredential(connection.credentialsEnvelope))
    } catch {
      return response({ error: 'Paraşüt kimlik bilgileri yeniden doğrulanmalı', status: 'reauthorization_required', canUse: false }, 409)
    }
    if (new Date(tokenSet.accessTokenExpiresAt).getTime() <= Date.now()) return response({ error: 'Paraşüt erişim süresi doldu; yeniden yetkilendirme gerekli', status: 'reauthorization_required', canUse: false }, 409)

    const discovery = await parasutHealthClient.discoverParasutCompanies(tokenSet.accessToken)
    if (!discovery.ok) {
      const health = evaluateParasutHealth({ workspaceId: ctx.workspace.id, connectionWorkspaceId: connection.workspaceId, selectedCompanyId: connection.companyId || '__discovery_pending__', provider: discovery })
      await db.$transaction([
        db.parasutConnection.update({ where: { id: connection.id }, data: { status: 'error', lastVerifiedAt: null } }),
        db.auditLog.create({ data: { workspaceId: ctx.workspace.id, actorId: ctx.user.id, action: 'parasut.health_checked', resourceType: 'parasut_connection', resourceId: connection.id, afterJson: JSON.stringify({ status: health.status, canUse: false }) } }),
      ])
      return response({ status: health.status, canUse: false }, failureStatus(health.status))
    }

    if (!connection.companyId) {
      await db.auditLog.create({ data: { workspaceId: ctx.workspace.id, actorId: ctx.user.id, action: 'parasut.health_checked', resourceType: 'parasut_connection', resourceId: connection.id, afterJson: JSON.stringify({ status: 'company_selection_required', companyCount: discovery.companies.length }) } })
      return response({ status: 'company_selection_required', canUse: false, companies: publicCompanies(discovery.companies) }, 409)
    }

    const selected = discovery.companies.find(company => company.id === connection.companyId)
    if (!selected) {
      const health = evaluateParasutHealth({ workspaceId: ctx.workspace.id, connectionWorkspaceId: connection.workspaceId, selectedCompanyId: connection.companyId, provider: { ok: true, companyId: '__provider_scope_mismatch__', tokenValid: false } })
      await db.$transaction([
        db.parasutConnection.update({ where: { id: connection.id }, data: { status: 'error', lastVerifiedAt: null } }),
        db.auditLog.create({ data: { workspaceId: ctx.workspace.id, actorId: ctx.user.id, action: 'parasut.health_checked', resourceType: 'parasut_connection', resourceId: connection.id, afterJson: JSON.stringify({ status: health.status, canUse: false }) } }),
      ])
      return response({ status: health.status, canUse: false }, 409)
    }

    const provider = await parasutHealthClient.checkParasutCompanyHealth(selected.id, tokenSet.accessToken)
    const health = evaluateParasutHealth({ workspaceId: ctx.workspace.id, connectionWorkspaceId: connection.workspaceId, selectedCompanyId: connection.companyId, provider })
    const nextStatus = health.status === 'active' ? 'active' : health.status === 'reauthorization_required' ? 'error' : 'error'
    await db.$transaction([
      db.parasutConnection.update({ where: { id: connection.id }, data: { status: nextStatus, lastVerifiedAt: health.status === 'active' ? new Date() : null } }),
      db.auditLog.create({ data: { workspaceId: ctx.workspace.id, actorId: ctx.user.id, action: 'parasut.health_checked', resourceType: 'parasut_connection', resourceId: connection.id, afterJson: JSON.stringify({ status: health.status, canUse: health.canUse, companyId: health.status === 'active' ? connection.companyId : undefined }) } }),
    ])
    return response(health, health.status === 'active' ? 200 : failureStatus(health.status))
  } catch (error) {
    if (error instanceof Error && /origin|required|allowed/.test(error.message)) return response({ error: 'İstek kaynağı doğrulanamadı' }, 403)
    return response({ error: 'Paraşüt sağlık kontrolü tamamlanamadı', status: 'health_check_failed', canUse: false }, 503)
  }
}
