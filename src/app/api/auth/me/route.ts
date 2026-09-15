import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const ctx = await getSessionFromRequest(req)
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ data: ctx })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getSessionFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const avatarUrl = body?.avatarUrl
  if (avatarUrl !== null && typeof avatarUrl !== 'string') {
    return NextResponse.json({ error: 'Geçersiz profil görseli' }, { status: 400 })
  }

  if (typeof avatarUrl === 'string') {
    const match = avatarUrl.match(/^\/api\/media\/([^/?]+)\?scope=global$/)
    if (!match) return NextResponse.json({ error: 'Profil görseli ortak medya varlığı olmalı' }, { status: 400 })
    const asset = await db.mediaAsset.findFirst({
      where: { id: match[1], workspaceId: ctx.workspace.id, formId: null, mime: { startsWith: 'image/' }, scanStatus: 'clean' },
      select: { id: true },
    })
    if (!asset) return NextResponse.json({ error: 'Profil görseli bulunamadı' }, { status: 404 })
  }

  const user = await db.user.update({
    where: { id: ctx.user.id },
    data: { avatarUrl },
    select: { id: true, email: true, name: true, avatarUrl: true, locale: true, timezone: true },
  })
  return NextResponse.json({ data: { ...user, role: ctx.user.role } })
}
