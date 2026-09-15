import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ready', db: 'ok' }, { status: 200 })
  } catch {
    return NextResponse.json({ status: 'not_ready', db: 'fail' }, { status: 503 })
  }
}
