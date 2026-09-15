const PUBLIC_PROVIDER_CONFIG_KEYS = ['publishableKey', 'merchantId', 'accountId'] as const
const MAX_PUBLIC_CONFIG_VALUE_LENGTH = 255

/**
 * Returns only provider settings that are safe to expose to an authenticated
 * workspace client. Server credentials and unknown persisted keys are omitted.
 */
export function sanitizePaymentProviderPublicConfig(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}

  const source = value as Record<string, unknown>
  const result: Record<string, string> = {}

  for (const key of PUBLIC_PROVIDER_CONFIG_KEYS) {
    const candidate = source[key]
    if (
      typeof candidate === 'string' &&
      candidate.trim().length > 0 &&
      candidate.length <= MAX_PUBLIC_CONFIG_VALUE_LENGTH &&
      !/[\r\n]/.test(candidate)
    ) {
      result[key] = candidate.trim()
    }
  }

  return result
}
