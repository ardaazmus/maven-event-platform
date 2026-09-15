import { NextRequest, NextResponse } from 'next/server'
import { runEmailProtectionWorkerOnce } from '@/lib/email-protection-worker'
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
    const result = await runEmailProtectionWorkerOnce(limit)
    const processed = result.results.filter(item => item.status === 'processed').length
    const failed = result.results.filter(item => item.status === 'failed').length
    return NextResponse.json({ accepted: true, claimed: result.claimed, processed, failed })
  } catch {
    return NextResponse.json({ error: 'worker_unavailable' }, { status: 503 })
  }
}
