import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { defaultFormUseProfile, FORM_USE_PROFILES } from '@/lib/form-use-profile'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const auth = can.readForms(ctx as any)
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const folderId = searchParams.get('folderId')
  const search = searchParams.get('search')

  const where: any = {
    workspaceId: ctx.workspace.id,
    deletedAt: null,
  }
  if (status && status !== 'all') where.status = status
  if (folderId) where.folderId = folderId
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { slug: { contains: search } },
    ]
  }

  const forms = await db.form.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      folder: true,
      tags: { include: { tag: true } },
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { submissions: true } },
    },
  })

  return NextResponse.json({
    data: forms.map(f => {
      const settings = (() => { try { return JSON.parse(f.settingsJson || '{}') } catch { return {} } })()
      return {
        id: f.id,
        title: f.title,
        description: f.description,
        slug: f.slug,
        status: f.status,
        folder: f.folder ? { id: f.folder.id, name: f.folder.name, color: f.folder.color } : null,
        tags: f.tags.map(ft => ({ id: ft.tag.id, name: ft.tag.name, color: ft.tag.color })),
        owner: f.owner,
        submissionCount: f.submissionCount,
        todaySubmissionCount: f.todaySubmissionCount,
        responseLimit: f.responseLimit,
        coverMediaId: settings.coverMediaId || null,
        coverImageUrl: settings.coverImageUrl || null, // deprecated, kept for migration
        coverImageAlt: settings.coverImageAlt || null,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        startDate: f.startDate,
        endDate: f.endDate,
      }
    }),
  })
}

const createFormSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/),
  folderId: z.string().optional().nullable(),
  locale: z.string().optional().default('tr'),
  timezone: z.string().optional().default('Europe/Istanbul'),
  useProfile: z.enum(FORM_USE_PROFILES).optional().default(defaultFormUseProfile()),
  enableUserConfirmation: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const auth = can.writeForms(ctx as any)
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const parsed = createFormSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Geçersiz veri' }, { status: 400 })
    }

    const { title, description, slug, folderId, locale, timezone, useProfile, enableUserConfirmation } = parsed.data

    // Check slug uniqueness
    const existing = await db.form.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: 'Bu slug zaten kullanımda' }, { status: 409 })
    }

    const form = await db.$transaction(async (tx) => {
      const created = await tx.form.create({
        data: {
          workspaceId: ctx.workspace.id,
          folderId: folderId || null,
          ownerId: ctx.user.id,
          createdById: ctx.user.id,
          title,
          description: description || null,
          slug,
          status: 'draft',
          settingsJson: JSON.stringify({
            locale,
            timezone,
            useProfile,
            submitButtonText: 'Gönder',
            successMessage: 'Formunuz başarıyla gönderildi. Teşekkürler!',
          }),
        },
        include: { folder: true, tags: { include: { tag: true } } },
      })

      if (enableUserConfirmation) {
        await tx.formField.create({ data: { formId: created.id, fieldKey: 'email', type: 'email', label: 'E-posta Adresi', required: true, placeholder: 'ornek@email.com', sortOrder: 1 } })
        await tx.notification.create({
          data: {
            formId: created.id,
            name: 'Kullanıcı Onayı',
            type: 'user_confirmation',
            enabled: true,
            configJson: JSON.stringify({ subject: 'Yanıtınız alınmıştır: {form_title}', body: 'Form yanıtınız başarıyla alındı.' }),
          },
        })
      }

      await tx.auditLog.create({
        data: {
          workspaceId: ctx.workspace.id,
          actorId: ctx.user.id,
          action: 'form.create',
          resourceType: 'form',
          resourceId: created.id,
          afterJson: JSON.stringify({ title: created.title, slug: created.slug, enableUserConfirmation }),
        },
      })
      return created
    })

    return NextResponse.json({ data: form })
  } catch (e: any) {
    console.error('Form creation error:', e)
    return NextResponse.json({ error: 'Sunucu hatası: ' + (e?.message || 'Bilinmeyen hata') }, { status: 500 })
  }
}
