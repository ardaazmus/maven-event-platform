import { db } from '@/lib/db'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'mavenforms_session'
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 days
// ponytail: 30d pilot kabulü — prod hedef 1h + refresh rotation (M01.6 docs/SESSION-POLICY.md)

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

// Extract token from Authorization header (via next/headers) OR cookie
// Works WITHOUT a request parameter by using next/headers async APIs
export async function getTokenFromRequest(req?: NextRequest): Promise<string | null> {
  try {
    // 1. Try Authorization Bearer header from the incoming request
    //    - If req is provided, use it directly
    //    - Otherwise, fall back to next/headers() to read headers from the current request
    if (req) {
      const authHeader = req.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice(7)
      }
    } else {
      // Read headers from the current request context (works in Route Handlers)
      const headerStore = await headers()
      const authHeader = headerStore.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice(7)
      }
    }

    // 2. Fallback to cookie
    const cookieStore = await cookies()
    return cookieStore.get(SESSION_COOKIE)?.value ?? null
  } catch {
    return null
  }
}

export async function getSessionFromRequest(req?: NextRequest): Promise<{ user: any; workspace: any } | null> {
  try {
    const token = await getTokenFromRequest(req)
    if (!token) return null

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session || session.expiresAt < new Date()) {
      return null
    }

    // Explicit workspace claim (ADR-0003): client sends x-workspace-id.
    // Single-membership users keep working without a claim (backward compatible).
    // Multi-membership users MUST send a valid claim; ambiguous requests are denied.
    let claim: string | null = null
    try {
      const store = req ? req.headers : await headers()
      claim = store.get('x-workspace-id')
    } catch {
      claim = null
    }

    let membership
    if (claim) {
      membership = await db.workspaceMember.findFirst({
        where: { userId: session.user.id, workspaceId: claim, status: 'active' },
        include: { workspace: true },
      })
      if (!membership) return null
    } else {
      const memberships = await db.workspaceMember.findMany({
        where: { userId: session.user.id, status: 'active' },
        include: { workspace: true },
        orderBy: { joinedAt: 'asc' },
      })
      if (memberships.length !== 1) return null
      membership = memberships[0]
    }

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

// Legacy alias - now also reads Authorization header via next/headers
export async function getSessionFromCookie(): Promise<{ user: any; workspace: any } | null> {
  return getSessionFromRequest()
}

// Set cookie directly on a NextResponse (as backup; primary auth via Authorization header)
export function setSessionCookieOnResponse(res: NextResponse, token: string, expiresAt: Date) {
  try {
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    })
  } catch {}
}

export function clearSessionCookieOnResponse(res: NextResponse) {
  try {
    res.cookies.delete(SESSION_COOKIE)
  } catch {}
}

export async function destroySession(token: string) {
  try {
    await db.session.deleteMany({ where: { token } })
  } catch {}
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE
export const SESSION_DURATION_MS = SESSION_DURATION
