import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { containsForbiddenKeys } from '@/lib/public-dto'

interface RouteParams {
  params: Promise<{ slug: string }>
}

// Public endpoint - returns immutable published snapshot (no auth, no live draft)
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params

  const form = await db.form.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, status: true, publishedVersionId: true },
  })

  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })
  if (form.status !== 'published' || !form.publishedVersionId) {
    return NextResponse.json({ error: 'Form yayında değil' }, { status: 403 })
  }
  const version = await db.formVersion.findUnique({ where: { id: form.publishedVersionId } })
  if (!version || version.status !== 'published') {
    return NextResponse.json({ error: 'Form yayında değil' }, { status: 403 })
  }
  // Snapshot already sanitized at publish time; parse and return as is
  let snapshot: any
  try {
    snapshot = JSON.parse(version.schemaJson)
  } catch {
    return NextResponse.json({ error: 'Form yayında değil' }, { status: 500 })
  }
  // Double-check no internal leakage in stored snapshot (defense in depth).
  // Keep this at the anonymous read boundary so older or manually altered
  // published snapshots fail closed even if publish-time validation changes.
  const forbidden = containsForbiddenKeys(snapshot)
  if (forbidden.length > 0) {
    return NextResponse.json({ error: 'Form yayında değil' }, { status: 500 })
  }
  return NextResponse.json({ data: snapshot })
}
