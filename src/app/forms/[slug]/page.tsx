import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { PublicFormRenderer } from '@/components/mavenforms/public-form-renderer'

interface RouteParams {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export default async function PublicFormPage({ params }: RouteParams) {
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

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form bulunamadı</h1>
          <p className="text-gray-600">Aradığınız form mevcut değil veya kaldırılmış.</p>
        </div>
      </div>
    )
  }

  if (form.status !== 'published') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form yayında değil</h1>
          <p className="text-gray-600">Bu form şu anda aktif değil.</p>
        </div>
      </div>
    )
  }

  const settings = JSON.parse(form.settingsJson || '{}')
  const fields = form.fields.map((f) => ({
    ...f,
    config: JSON.parse(f.configJson || '{}'),
  }))
  const theme = form.themes[0]
    ? {
        ...form.themes[0],
        tokens: JSON.parse(form.themes[0].tokensJson || '{}'),
      }
    : null
  const appearance = form.appearance
    ? {
        ...form.appearance,
        footerLinks: form.appearance.footerLinks
          ? JSON.parse(form.appearance.footerLinks)
          : [],
      }
    : null

  return (
    <PublicFormRenderer
      form={{
        id: form.id,
        title: form.title,
        description: form.description,
        slug: form.slug,
        settings,
        fields,
        theme,
        appearance,
      }}
    />
  )
}
