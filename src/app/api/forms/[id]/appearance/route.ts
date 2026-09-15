import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Default appearance config
function getDefaultAppearance() {
  return {
    headerEnabled: true,
    headerLogoMediaId: null,
    headerLogoUrl: null,
    headerLogoAlt: null,
    headerLogoWidth: null,
    headerTitle: null,
    headerSubtitle: null,
    headerDescription: null,
    headerBgColor: '#ffffff',
    headerBgMediaId: null,
    headerBgImage: null,
    headerTextColor: '#1a1a1a',
    headerAlign: 'center',
    headerPadding: 32,
    contactBarEnabled: false,
    contactBarBgColor: '#e31e24',
    contactBarTextColor: '#ffffff',
    contactEmail: null,
    contactPhone: null,
    contactAddress: null,
    socialInstagram: null,
    socialLinkedin: null,
    socialTwitter: null,
    socialFacebook: null,
    socialYoutube: null,
    footerEnabled: true,
    footerLogoMediaId: null,
    footerLogoUrl: null,
    footerText: null,
    footerBgColor: '#1a1a1a',
    footerTextColor: '#ffffff',
    footerLinks: null,
    footerPadding: 24,
    customCss: null,
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.readForms(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  let appearance = await db.formAppearance.findUnique({ where: { formId: id } })
  if (!appearance) {
    // Create default appearance
    appearance = await db.formAppearance.create({
      data: {
        formId: id,
        ...getDefaultAppearance(),
        headerTitle: form.title,
        headerDescription: form.description,
      } as any,
    })
  }

  return NextResponse.json({
    data: {
      ...appearance,
      footerLinks: appearance.footerLinks ? JSON.parse(appearance.footerLinks) : [],
    },
  })
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writeForms(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  const body = await req.json()

  // Whitelist allowed fields
  const allowedFields = [
    'headerEnabled', 'headerLogoMediaId', 'headerLogoUrl', 'headerLogoAlt', 'headerLogoWidth',
    'headerTitle', 'headerSubtitle', 'headerDescription',
    'headerBgColor', 'headerBgMediaId', 'headerBgImage', 'headerTextColor', 'headerAlign', 'headerPadding',
    'contactBarEnabled', 'contactBarBgColor', 'contactBarTextColor',
    'contactEmail', 'contactPhone', 'contactAddress',
    'socialInstagram', 'socialLinkedin', 'socialTwitter', 'socialFacebook', 'socialYoutube',
    'footerEnabled', 'footerLogoMediaId', 'footerLogoUrl', 'footerText',
    'footerBgColor', 'footerTextColor', 'footerPadding',
    'customCss',
  ]

  const data: any = {}
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      data[key] = body[key]
    }
  }

  const mediaKeys = ['headerLogoMediaId', 'headerBgMediaId', 'footerLogoMediaId']
  const mediaIds = mediaKeys.map((key) => data[key]).filter((value): value is string => typeof value === 'string' && value.length > 0)
  if (mediaIds.length !== mediaKeys.filter((key) => data[key] !== undefined && data[key] !== null && data[key] !== '').length) {
    return NextResponse.json({ error: 'Geçersiz medya kimliği' }, { status: 400 })
  }
  if (mediaIds.length > 0) {
    const assets = await db.mediaAsset.findMany({ where: { id: { in: mediaIds }, workspaceId: ctx.workspace.id, formId: id }, select: { id: true } })
    if (assets.length !== new Set(mediaIds).size) {
      return NextResponse.json({ error: 'Medya bu forma ait değil' }, { status: 403 })
    }
  }

  // Handle footerLinks as JSON
  if (body.footerLinks !== undefined) {
    data.footerLinks = JSON.stringify(body.footerLinks || [])
  }

  // Upsert appearance
  const existing = await db.formAppearance.findUnique({ where: { formId: id } })
  let appearance
  if (existing) {
    appearance = await db.formAppearance.update({
      where: { formId: id },
      data,
    })
  } else {
    appearance = await db.formAppearance.create({
      data: {
        formId: id,
        ...getDefaultAppearance(),
        ...data,
      } as any,
    })
  }

  return NextResponse.json({
    data: {
      ...appearance,
      footerLinks: appearance.footerLinks ? JSON.parse(appearance.footerLinks) : [],
    },
  })
}
