import { timingSafeEqual } from 'node:crypto'

export const MAX_INTERNAL_WORKER_BATCH_SIZE = 50
export const DEFAULT_INTERNAL_WORKER_BATCH_SIZE = 10

/** Compares scheduler secrets without exposing timing or length differences. */
export function authorizeInternalWorkerSecret(expected: string | undefined, provided: string | null): boolean {
  if (!expected || !provided) return false
  const expectedBytes = Buffer.from(expected, 'utf8')
  const providedBytes = Buffer.from(provided, 'utf8')
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes)
}

/** Parses a bounded decimal batch size shared by all internal workers. */
export function parseInternalWorkerLimit(value: string | null): number | null {
  if (value === null) return DEFAULT_INTERNAL_WORKER_BATCH_SIZE
  if (!/^\d+$/.test(value)) return null
  const limit = Number(value)
  return Number.isSafeInteger(limit) && limit > 0 && limit <= MAX_INTERNAL_WORKER_BATCH_SIZE ? limit : null
}
