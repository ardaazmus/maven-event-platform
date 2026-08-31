import { NextResponse } from 'next/server'
import { clearSessionCookie, destroySession } from '@/lib/auth'

export async function POST() {
  try {
    // Note: in real impl we'd extract token from cookie and destroy session
    await destroySession('placeholder') // We use cookie clearing approach
    await clearSessionCookie()
    return NextResponse.json({ data: { success: true } })
  } catch (e) {
    return NextResponse.json({ error: 'Çıkış hatası' }, { status: 500 })
  }
}
