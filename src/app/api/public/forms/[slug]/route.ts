import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ slug: string }>
}

// Public endpoint - returns form data for rendering (no auth required)
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params

  const form = await db.form.findFirst({
    where: { slug, deletedAt: null },
    include: {
      fields: {
        where: { adminOnly: false, hidden: false },
        orderBy: { sortOrder: 'asc' },
      },
      themes: { take: 1 },
      appearance: true,
    },
  })

  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  // Allow preview=true for draft forms, otherwise require published
  const { searchParams } = new URL(req.url)
  const isPreview = searchParams.get('preview') === 'true'
  if (form.status !== 'published' && !isPreview) {
    return NextResponse.json({ error: 'Form yayında değil' }, { status: 403 })
  }

  return NextResponse.json({
    data: {
      id: form.id,
      title: form.title,
      description: form.description,
      slug: form.slug,
      status: form.status,
      settings: JSON.parse(form.settingsJson || '{}'),
      fields: form.fields.map((f) => ({
        id: f.id,
        fieldKey: f.fieldKey,
        type: f.type,
        label: f.label,
        description: f.description,
        placeholder: f.placeholder,
        helpText: f.helpText,
        required: f.required,
        readOnly: f.readOnly,
        defaultValue: f.defaultValue,
        config: JSON.parse(f.configJson || '{}'),
      })),
      theme: form.themes[0]
        ? {
            ...form.themes[0],
            tokens: JSON.parse(form.themes[0].tokensJson || '{}'),
          }
        : null,
      appearance: form.appearance
        ? {
            ...form.appearance,
            footerLinks: form.appearance.footerLinks
              ? JSON.parse(form.appearance.footerLinks)
              : [],
          }
        : null,
    },
  })
}
