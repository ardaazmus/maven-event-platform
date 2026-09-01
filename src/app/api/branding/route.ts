import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'

function getDefaultBranding(workspaceName: string) {
  return {
    appName: 'MavenForms',
    appTagline: 'FORM PLATFORM',
    logoUrl: null,
    logoDarkUrl: null,
    faviconUrl: null,
    primaryColor: '#10b981',
    loginTitle: 'Formlarınızı tasarlayın, yanıtları otomatikleştirin.',
    loginSubtitle: 'Modern, mobil öncelikli form platformu. Tasarla → yayınla → topla → raporla zincirinde tek çalışma alanı.',
    loginHeroImage: null,
    loginBgColor: '#10b981',
    loginShowFeatures: true,
    footerText: `© ${new Date().getFullYear()} MavenForms. Tüm hakları saklıdır.`,
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
        ...getDefaultBranding(ws?.name || 'MavenForms'),
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

// PATCH - update branding (auth required)
export async function PATCH(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const allowedFields = [
    'appName', 'appTagline', 'logoUrl', 'logoDarkUrl', 'faviconUrl', 'primaryColor',
    'loginTitle', 'loginSubtitle', 'loginHeroImage', 'loginBgColor', 'loginShowFeatures',
    'footerText', 'customDomain',
  ]

  const data: any = {}
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      data[key] = body[key]
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
        ...getDefaultBranding(ws?.name || 'MavenForms'),
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
