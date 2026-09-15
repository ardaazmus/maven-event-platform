import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { db } from '@/lib/db'
import { resolveBadgeEntrySurface } from '@/lib/badge-entry-surface-contract'

interface RouteParams {
  params: Promise<{ id: string }>
}

function normalizeFormStatus(status: string): 'draft' | 'published' | 'paused' | 'archived' {
  if (status === 'published' || status === 'paused' || status === 'archived') return status
  return 'draft'
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.readSubmissions(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const form = await db.form.findFirst({
    where: { id, workspaceId: ctx.workspace.id, deletedAt: null },
    select: { id: true, status: true },
  })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  const eligibleSubmissionCount = await db.submission.count({
    where: { formId: form.id, status: { notIn: ['spam', 'archived'] } },
  })
  const formStatus = normalizeFormStatus(form.status)
  const base = {
    authenticated: true,
    canReadBadge: true,
    formStatus,
    workspaceMatchesForm: true,
    eligibleSubmissionCount,
  }

  return NextResponse.json({
    data: {
      formId: form.id,
      eligibleSubmissionCount,
      entrySurfaces: {
        formDetail: resolveBadgeEntrySurface({ ...base, surface: 'FORM_DETAIL' }),
        submissionSelection: resolveBadgeEntrySurface({ ...base, surface: 'SUBMISSION_SELECTION' }),
      },
    },
  })
}
