import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Default appearance config
function getDefaultAppearance() {
  return {
    headerEnabled: true,
    headerLogoUrl: null,
    headerLogoAlt: null,
    headerLogoWidth: null,
    headerTitle: null,
    headerSubtitle: null,
    headerDescription: null,
    headerBgColor: '#ffffff',
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

  const { id } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  const body = await req.json()

  // Whitelist allowed fields
  const allowedFields = [
    'headerEnabled', 'headerLogoUrl', 'headerLogoAlt', 'headerLogoWidth',
    'headerTitle', 'headerSubtitle', 'headerDescription',
    'headerBgColor', 'headerBgImage', 'headerTextColor', 'headerAlign', 'headerPadding',
    'contactBarEnabled', 'contactBarBgColor', 'contactBarTextColor',
    'contactEmail', 'contactPhone', 'contactAddress',
    'socialInstagram', 'socialLinkedin', 'socialTwitter', 'socialFacebook', 'socialYoutube',
    'footerEnabled', 'footerLogoUrl', 'footerText',
    'footerBgColor', 'footerTextColor', 'footerPadding',
    'customCss',
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
