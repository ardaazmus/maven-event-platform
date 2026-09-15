import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const rid = req.headers.get('x-request-id') || Math.random().toString(36).slice(2,10)
  res.headers.set('x-request-id', rid)
  if (process.env.NODE_ENV === 'production') res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  // Structured log without PII/secrets — ponytail: add pino/winston when volume matters
  const log = JSON.stringify({ rid, method: req.method, path: req.nextUrl.pathname, ua: req.headers.get('user-agent')?.slice(0,80) })
  console.log(log)
  return res
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
