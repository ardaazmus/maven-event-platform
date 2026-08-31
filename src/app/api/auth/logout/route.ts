import { NextResponse } from 'next/server'
import { clearSessionCookieOnResponse, destroySession, getTokenFromRequest } from '@/lib/auth'

export async function POST() {
  try {
    // Get token from cookie and destroy the session in DB
    const token = await getTokenFromRequest()
    if (token) {
      await destroySession(token)
    }
    
    // Clear cookie on response
    const res = NextResponse.json({ data: { success: true } })
    clearSessionCookieOnResponse(res)
    return res
  } catch (e) {
    return NextResponse.json({ error: 'Çıkış hatası' }, { status: 500 })
  }
}
