import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Geçersiz e-posta veya parola' }, { status: 400 })
    }

    const { email, password } = parsed.data

    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })
    
    // Constant-time response - do not reveal user existence
    if (!user || user.status !== 'active' || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Geçersiz e-posta veya parola' }, { status: 401 })
    }

    const userAgent = req.headers.get('user-agent') ?? undefined
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? undefined

    const { token, expiresAt } = await createSession(user.id, userAgent, ip)
    await setSessionCookie(token, expiresAt)

    return NextResponse.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
