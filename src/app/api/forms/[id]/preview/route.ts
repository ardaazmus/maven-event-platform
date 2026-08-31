import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Public preview - returns form data without auth (for embedded/preview)
export async function GET(req: Request, { params }: RouteParams) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')

  const where: any = { deletedAt: null }
  if (slug) where.slug = slug
  else where.id = id

  const form = await db.form.findFirst({
    where,
    include: {
      fields: {
        where: { adminOnly: false, hidden: false },
        orderBy: { sortOrder: 'asc' },
      },
      themes: { take: 1 },
    },
  })

  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })
  if (form.status !== 'published' && !searchParams.get('preview')) {
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
      fields: form.fields.map(f => ({
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
      theme: form.themes[0] ? {
        ...form.themes[0],
        tokens: JSON.parse(form.themes[0].tokensJson || '{}'),
      } : null,
    },
  })
}
