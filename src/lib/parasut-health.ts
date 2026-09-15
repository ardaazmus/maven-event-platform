export type ParasutHealthProviderResult =
  | { ok: true; companyId: string; tokenValid: boolean }
  | { ok: false; kind: 'authentication' | 'rate_limited' | 'unavailable' | 'unknown'; retryable: boolean }

export type ParasutHealthResult =
  | { status: 'active'; canUse: true; companyId: string }
  | { status: 'scope_mismatch' | 'company_selection_required' | 'reauthorization_required' | 'health_check_retryable' | 'health_check_failed'; canUse: false }

/**
 * Decides whether a provider health response can activate one workspace
 * connection. Provider response details and credentials never enter the DTO.
 */
export function evaluateParasutHealth(input: { workspaceId: string; connectionWorkspaceId: string; selectedCompanyId: string | null; provider: ParasutHealthProviderResult }): ParasutHealthResult {
  if (!input.workspaceId || input.workspaceId !== input.connectionWorkspaceId) return { status: 'scope_mismatch', canUse: false }
  if (!input.selectedCompanyId) return { status: 'company_selection_required', canUse: false }
  if (!input.provider.ok) return { status: input.provider.retryable ? 'health_check_retryable' : 'health_check_failed', canUse: false }
  if (input.provider.companyId !== input.selectedCompanyId) return { status: 'scope_mismatch', canUse: false }
  if (!input.provider.tokenValid) return { status: 'reauthorization_required', canUse: false }
  return { status: 'active', canUse: true, companyId: input.provider.companyId }
}
