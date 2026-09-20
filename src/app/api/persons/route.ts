import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { normalizeIntakeIdentity } from '@/lib/intake'

const createPersonSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
})

export async function GET() {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.readPersons(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const persons = await db.person.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({
    data: persons.map(p => ({ id: p.id, fullName: p.fullName, email: p.email, phone: p.phone })),
  })
}

export async function POST(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writePersons(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const body = await req.json().catch(() => null)
  const parsed = createPersonSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
  }

  // Canonical intake: normalize before dedup/create so every source matches the same keys.
  const identity = normalizeIntakeIdentity({
    fullName: parsed.data.fullName,
    email: parsed.data.email ?? null,
    phone: parsed.data.phone ?? null,
  })
  if (identity.fullName === '') {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  // Dedup review: same email in workspace is not auto-merged (F1-1.4)
  if (identity.email) {
    const dup = await db.person.findFirst({
      where: { workspaceId: ctx.workspace.id, email: identity.email },
      select: { id: true },
    })
    if (dup) {
      return NextResponse.json({ error: 'Duplicate review', duplicateOf: dup.id }, { status: 409 })
    }
  }

  const person = await db.person.create({
    data: {
      workspaceId: ctx.workspace.id,
      fullName: identity.fullName,
      email: identity.email,
      phone: identity.phone,
    },
  })

  return NextResponse.json({ data: { id: person.id } }, { status: 201 })
}
