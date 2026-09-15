export type ProviderMessageIdentityInput = {
  provider: string
  providerMessageId: string
}

export type ProviderMessageIdentity = {
  provider: string
  providerMessageId: string
}

/** Normalizes the non-PII provider identity used to correlate send and webhook records. */
export function normalizeProviderMessageIdentity(input: ProviderMessageIdentityInput): ProviderMessageIdentity {
  const provider = input.provider.trim().toLowerCase()
  const providerMessageId = input.providerMessageId.trim()
  if (!provider || provider.length > 64 || /[\r\n]/.test(provider)) throw new Error('provider_invalid')
  if (!providerMessageId || providerMessageId.length > 256 || /[\r\n]/.test(providerMessageId)) {
    throw new Error('provider_message_id_invalid')
  }
  return { provider, providerMessageId }
}
