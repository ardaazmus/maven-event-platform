export const WORKER_REPLAY_SCENARIOS = Object.freeze(['success', 'crash', 'stale_lease', 'duplicate', 'retryable_failure', 'permanent_failure', 'unknown'] as const)
export type WorkerReplayScenario = (typeof WORKER_REPLAY_SCENARIOS)[number]
export type WorkerReplayAction = 'ack' | 'reclaim' | 'deduplicate' | 'retry' | 'dead_letter' | 'quarantine'

export type WorkerReplayResult =
  | { ok: true; decision: Readonly<{ scenario: WorkerReplayScenario; action: WorkerReplayAction; retryable: boolean; terminal: boolean }> }
  | { ok: false; reason: 'input_invalid' | 'idempotency_required' | 'lease_not_stale' | 'payload_unvalidated' }

function safeCount(value: unknown, max = 20): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max
}

function safeIdempotency(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9:_-]{8,160}$/u.test(value)
}

function decision(scenario: WorkerReplayScenario, action: WorkerReplayAction, retryable: boolean, terminal: boolean): WorkerReplayResult {
  return { ok: true, decision: { scenario, action, retryable, terminal } }
}

/** Decides worker recovery without executing queue, retry, DLQ or quarantine side effects. */
export function evaluateWorkerReplay(input: {
  scenario: WorkerReplayScenario
  attemptCount: number
  maxAttempts: number
  leaseUntilMs: number | null
  nowMs: number
  idempotencyKey: string | null
  payloadValidated: boolean
}): WorkerReplayResult {
  if (!input || !WORKER_REPLAY_SCENARIOS.includes(input.scenario) || !safeCount(input.attemptCount) || !safeCount(input.maxAttempts) || input.maxAttempts < 1 || input.attemptCount > input.maxAttempts || !safeCount(input.nowMs, Number.MAX_SAFE_INTEGER) || (input.leaseUntilMs !== null && !safeCount(input.leaseUntilMs, Number.MAX_SAFE_INTEGER))) return { ok: false, reason: 'input_invalid' }
  if (!safeIdempotency(input.idempotencyKey)) return { ok: false, reason: 'idempotency_required' }
  if (input.payloadValidated !== true && input.scenario !== 'unknown') return { ok: false, reason: 'payload_unvalidated' }
  if (input.scenario === 'success') return decision(input.scenario, 'ack', false, true)
  if (input.scenario === 'duplicate') return decision(input.scenario, 'deduplicate', false, true)
  if (input.scenario === 'unknown') return decision(input.scenario, 'quarantine', false, true)
  if (input.scenario === 'permanent_failure') return decision(input.scenario, 'dead_letter', false, true)
  if (input.scenario === 'retryable_failure') return input.attemptCount >= input.maxAttempts ? decision(input.scenario, 'dead_letter', false, true) : decision(input.scenario, 'retry', true, false)
  if (input.leaseUntilMs === null || input.leaseUntilMs >= input.nowMs) return { ok: false, reason: 'lease_not_stale' }
  return decision(input.scenario, 'reclaim', true, false)
}
