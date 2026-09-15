import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { runPaymentRetrieveBatch, type PaymentRetrieveBatchItem } from '@/lib/payment-retrieve-batch-worker'
import { runNextDuePaymentRetrieveFromDatabase } from '@/lib/payment-retrieve-database-worker'
import { buildPaymentRetrieveWorkerRunSummary } from '@/lib/payment-retrieve-worker-observability'
import { authorizePaymentRetrieveWorkerRequest } from '@/lib/payment-retrieve-worker-gate'

export const runtime = 'nodejs'

function batchItemFromWorkerResult(result: Awaited<ReturnType<typeof runNextDuePaymentRetrieveFromDatabase>>): PaymentRetrieveBatchItem {
  if (result.ok || result.stage !== 'connection') return result
  return {
    ok: false,
    stage: 'retrieve',
    category: 'configuration',
    code: `connection_${result.reason}`,
    persistence: result.persistence,
  }
}

export async function POST(req: NextRequest) {
  const gate = authorizePaymentRetrieveWorkerRequest({
    expectedSecret: process.env.MAVENFORMS_PAYMENT_WORKER_SECRET,
    providedSecret: req.headers.get('x-mavenforms-worker-secret'),
    limit: new URL(req.url).searchParams.get('limit'),
  })
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: gate.status })

  try {
    const startedAtMs = Date.now()
    const workerId = `payment-retrieve-${randomUUID()}`
    const nowMs = startedAtMs
    const result = await runPaymentRetrieveBatch({
      limit: gate.limit,
      workerId,
      nowMs,
      runNext: async next => batchItemFromWorkerResult(await runNextDuePaymentRetrieveFromDatabase({
        transaction: callback => db.$transaction(tx => callback(tx)),
        nowMs: next.nowMs,
        workerId: next.workerId,
        env: process.env,
      })),
    })
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 })
    const summary = buildPaymentRetrieveWorkerRunSummary({
      requested: result.requested,
      claimed: result.claimed,
      processed: result.processed,
      startedAtMs,
      finishedAtMs: Date.now(),
    })
    if (!summary) return NextResponse.json({ error: 'worker_unavailable' }, { status: 503 })
    return NextResponse.json({ accepted: true, ...summary }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json({ error: 'worker_unavailable' }, { status: 503 })
  }
}
