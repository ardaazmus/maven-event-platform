import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { db } from '@/lib/db'

interface RouteParams { params: Promise<{ id: string }> }

// GET /api/forms/:id/summary — BFF for selected-form workspace (M07.1)
export async function GET(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.readForms(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id } = await params
  const form = await db.form.findFirst({
    where: { id, workspaceId: ctx.workspace.id, deletedAt: null },
    include: { _count: { select: { fields: true, submissions: true } }, versions: { where: { status: 'published' }, orderBy: { versionNo: 'desc' }, take: 1 } },
  })
  if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const settings = (()=>{ try{ return JSON.parse(form.settingsJson||'{}')}catch{return{}}})()
  return NextResponse.json({
    data: {
      id: form.id, // authenticated app only, not public
      title: form.title,
      slug: form.slug,
      status: form.status,
      coverMediaId: settings.coverMediaId || null,
      coverImageUrl: settings.coverImageUrl || null,
      publishedVersionId: form.publishedVersionId,
      publishedVersionNo: form.versions[0]?.versionNo || null,
      updatedAt: form.updatedAt,
      fieldCount: form._count.fields,
      submissionCount: form.submissionCount,
      todaySubmissionCount: form.todaySubmissionCount,
      statusCounts: Object.fromEntries(
        (await db.submission.groupBy({
          by: ['status'],
          where: { formId: id },
          _count: { _all: true },
        })).map(row => [row.status, row._count._all])
      ),
    }
  })
}
