import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { assertMediaReadable } from '@/lib/media'
import { db } from '@/lib/db'
import { can } from '@/lib/policy'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

interface RouteParams { params: Promise<{ id: string }> }

// GET /api/media/:id — private serve, scoped, no public/ path (M04.3)
export async function GET(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const formId = searchParams.get('formId')
  const auth = formId ? can.readForms(ctx as any) : can.manageSettings(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })
  try {
    const asset = await assertMediaReadable(ctx as any, id, formId)
    const fullPath = path.join(process.cwd(), asset.storageKey)
    const buf = await readFile(fullPath)
    // infer content-type from mime or file
    const headers: Record<string,string> = {
      'Content-Type': asset.mime || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${asset.originalName.replace(/"/g,'')}"`,
      'Cache-Control': 'private, max-age=60',
      'X-Content-Type-Options': 'nosniff',
    }
    return new NextResponse(buf, { status: 200, headers })
  } catch (e: any) {
    const status = e?.status || 404
    return NextResponse.json({ error: 'Not found' }, { status })
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const formId = searchParams.get('formId')
  const auth = formId ? can.writeForms(ctx as any) : can.manageSettings(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json().catch(() => null)
  if (body?.altText !== null && typeof body?.altText !== 'string') {
    return NextResponse.json({ error: 'Geçersiz alt metin' }, { status: 400 })
  }
  const asset = await assertMediaReadable(ctx as any, id, formId)
  const updated = await db.mediaAsset.update({
    where: { id: asset.id },
    data: { altText: typeof body.altText === 'string' ? body.altText.trim().slice(0, 300) || null : null },
    select: { id: true, originalName: true, mime: true, size: true, altText: true, scanStatus: true },
  })
  return NextResponse.json({ data: updated })
}
