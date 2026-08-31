import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookieOnResponse, destroySession, getTokenFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    // Get token from Authorization header or cookie
    const token = await getTokenFromRequest(req)
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
