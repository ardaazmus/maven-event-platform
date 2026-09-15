import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { runOutboxDispatchWorkerOnce } from '@/lib/outbox-dispatch-worker'
import { authorizeInternalWorkerSecret, parseInternalWorkerLimit } from '@/lib/internal-worker-auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const workerSecret = process.env.MAVENFORMS_EMAIL_WORKER_SECRET
  if (!workerSecret) return NextResponse.json({ error: 'worker_unavailable' }, { status: 503 })
  if (!authorizeInternalWorkerSecret(workerSecret, req.headers.get('x-mavenforms-worker-secret'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const limit = parseInternalWorkerLimit(new URL(req.url).searchParams.get('limit'))
  if (limit === null) return NextResponse.json({ error: 'invalid_limit' }, { status: 400 })

  try {
    const result = await runOutboxDispatchWorkerOnce(limit, `email-dispatch-${randomUUID()}`)
    return NextResponse.json({ accepted: true, claimed: result.claimed, sent: result.accepted, rejected: result.rejected, failed: result.failed })
  } catch {
    return NextResponse.json({ error: 'worker_unavailable' }, { status: 503 })
  }
}
