import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { createPublicMediaToken } from '@/lib/public-media-token'

function safePublicBrandingMediaUrl(value: unknown, workspaceId: string) {
  if (typeof value !== 'string' || value.length > 2048) return null
  if (value.startsWith('/api/media/')) {
    const match = value.match(/^\/api\/media\/([^/?]+)(?:\?scope=global)?$/)
    return match ? `/api/public/branding/media/${createPublicMediaToken(match[1], workspaceId)}` : null
  }
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function getDefaultBranding(workspaceName: string) {
  return {
    appName: 'Maven Event Platform',
    appTagline: 'EVENT PLATFORM',
    logoMediaId: null,
    logoUrl: null,
    logoDarkMediaId: null,
    logoDarkUrl: null,
    faviconMediaId: null,
    faviconUrl: null,
    primaryColor: '#10b981',
    loginTitle: 'Etkinliklerinizi yönetin, kayıtları otomatikleştirin.',
    loginSubtitle: 'Modern, mobil öncelikli etkinlik platformu. Etkinlik → kayıt → bilet → yoklama zincirinde tek çalışma alanı.',
    loginHeroMediaId: null,
    loginHeroImage: null,
    loginBgColor: '#10b981',
    loginShowFeatures: true,
    footerText: `© ${new Date().getFullYear()} Maven Event Platform. Tüm hakları saklıdır.`,
    footerLinks: [],
    customDomain: null,
  }
}

// GET - returns branding for current workspace (auth required for admin, or public for login page)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const publicAccess = searchParams.get('public') === 'true'

  let workspaceId: string | null = null

  if (publicAccess) {
    // Public access (for login page) - get first/primary workspace
    const ws = await db.workspace.findFirst({
      where: { status: 'active' },
      orderBy: { createdAt: 'asc' },
    })
    workspaceId = ws?.id || null
  } else {
    // Authenticated access
    const ctx = await getSessionFromCookie()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.readForms(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })
    workspaceId = ctx.workspace.id
  }

  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  let branding = await db.workspaceBranding.findUnique({ where: { workspaceId } })
  if (!branding) {
    // Create default branding
    const ws = await db.workspace.findUnique({ where: { id: workspaceId } })
    branding = await db.workspaceBranding.create({
      data: {
        workspaceId,
        ...getDefaultBranding(ws?.name || 'Maven Event Platform'),
      } as any,
    })
  }

  const data = {
    ...branding,
    footerLinks: branding.footerLinks ? JSON.parse(branding.footerLinks) : [],
  } as any
  if (publicAccess) {
    data.logoUrl = data.logoMediaId
      ? `/api/public/branding/media/${createPublicMediaToken(data.logoMediaId, workspaceId)}`
      : safePublicBrandingMediaUrl(data.logoUrl, workspaceId)
    data.logoDarkUrl = data.logoDarkMediaId
      ? `/api/public/branding/media/${createPublicMediaToken(data.logoDarkMediaId, workspaceId)}`
      : safePublicBrandingMediaUrl(data.logoDarkUrl, workspaceId)
    data.faviconUrl = data.faviconMediaId
      ? `/api/public/branding/media/${createPublicMediaToken(data.faviconMediaId, workspaceId)}`
      : safePublicBrandingMediaUrl(data.faviconUrl, workspaceId)
    data.loginHeroImage = data.loginHeroMediaId
      ? `/api/public/branding/media/${createPublicMediaToken(data.loginHeroMediaId, workspaceId)}`
      : safePublicBrandingMediaUrl(data.loginHeroImage, workspaceId)
    delete data.logoMediaId
    delete data.logoDarkMediaId
    delete data.faviconMediaId
    delete data.loginHeroMediaId
  }

  return NextResponse.json({ data })
}

// PATCH - update branding (auth required)
export async function PATCH(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.manageSettings(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const body = await req.json()

  const allowedFields = [
    'appName', 'appTagline', 'logoMediaId', 'logoUrl', 'logoDarkMediaId', 'logoDarkUrl', 'faviconMediaId', 'faviconUrl', 'primaryColor',
    'loginTitle', 'loginSubtitle', 'loginHeroMediaId', 'loginHeroImage', 'loginBgColor', 'loginShowFeatures',
    'footerText', 'customDomain',
  ]

  const data: any = {}
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      data[key] = body[key]
    }
  }

  const mediaKeys = ['logoMediaId', 'logoDarkMediaId', 'faviconMediaId', 'loginHeroMediaId']
  const mediaIds = mediaKeys.map((key) => data[key]).filter((value): value is string => typeof value === 'string' && value.length > 0)
  if (mediaIds.length !== mediaKeys.filter((key) => data[key] !== undefined && data[key] !== null && data[key] !== '').length) {
    return NextResponse.json({ error: 'Geçersiz medya kimliği' }, { status: 400 })
  }
  if (mediaIds.length > 0) {
    const assets = await db.mediaAsset.findMany({ where: { id: { in: mediaIds }, workspaceId: ctx.workspace.id, formId: null }, select: { id: true } })
    if (assets.length !== new Set(mediaIds).size) {
      return NextResponse.json({ error: 'Medya workspace kapsamına ait değil' }, { status: 403 })
    }
  }

  // Handle footerLinks as JSON
  if (body.footerLinks !== undefined) {
    data.footerLinks = JSON.stringify(body.footerLinks || [])
  }

  const existing = await db.workspaceBranding.findUnique({ where: { workspaceId: ctx.workspace.id } })
  let branding
  if (existing) {
    branding = await db.workspaceBranding.update({
      where: { workspaceId: ctx.workspace.id },
      data,
    })
  } else {
    const ws = await db.workspace.findUnique({ where: { id: ctx.workspace.id } })
    branding = await db.workspaceBranding.create({
      data: {
        workspaceId: ctx.workspace.id,
        ...getDefaultBranding(ws?.name || 'Maven Event Platform'),
        ...data,
      } as any,
    })
  }

  return NextResponse.json({
    data: {
      ...branding,
      footerLinks: branding.footerLinks ? JSON.parse(branding.footerLinks) : [],
    },
  })
}
