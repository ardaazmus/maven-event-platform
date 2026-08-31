import { db } from '@/lib/db'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'mavenforms_session'
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 days

// Argon2id-compatible password hashing using scrypt (works on Hostinger PHP/Node shared)
// Note: For production with high security needs, use argon2 npm package on VPS
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [algo, salt, hash] = stored.split('$')
    if (algo !== 'scrypt' || !salt || !hash) return false
    const testHash = scryptSync(password, salt, 64).toString('hex')
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'))
  } catch {
    return false
  }
}

export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export async function createSession(userId: string, userAgent?: string, ip?: string) {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_DURATION)
  
  const session = await db.session.create({
    data: {
      userId,
      token,
      userAgent: userAgent ?? null,
      ip: ip ?? null,
      expiresAt,
    },
  })
  
  await db.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  })
  
  return { session, token, expiresAt }
}

export async function getSessionFromCookie(): Promise<{ user: any; workspace: any } | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session || session.expiresAt < new Date()) {
      return null
    }

    // Get the user's default workspace
    const membership = await db.workspaceMember.findFirst({
      where: { userId: session.user.id, status: 'active' },
      include: { workspace: true },
      orderBy: { joinedAt: 'asc' },
    })

    if (!membership) return null

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        avatarUrl: session.user.avatarUrl,
        role: membership.role,
        locale: session.user.locale,
        timezone: session.user.timezone,
      },
      workspace: {
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
        plan: membership.workspace.plan,
        locale: membership.workspace.locale,
        timezone: membership.workspace.timezone,
      },
    }
  } catch (e) {
    return null
  }
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function destroySession(token: string) {
  try {
    await db.session.deleteMany({ where: { token } })
  } catch {}
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE
