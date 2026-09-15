import { isPaymentProvider, type PaymentProvider, type PaymentProviderMode } from '@/lib/payment-provider-contract'

export type TenantPaymentConnectionInput = {
  tenantId: string
  workspaceId: string
  tenantWorkspaceId: string
  connectionWorkspaceId: string
  provider: string
  mode: string
  releaseGateOpen: boolean
}

export type TenantPaymentConnectionResult =
  | { ok: true; scope: 'tenant'; provider: PaymentProvider; mode: PaymentProviderMode }
  | {
      ok: false
      reason: 'input_invalid' | 'tenant_workspace_mismatch' | 'workspace_mismatch' | 'provider_invalid' | 'mode_invalid' | 'live_gate_closed'
    }

/** Keeps a V4 provider connection owned by its tenant and closed until release evidence exists. */
export function evaluateTenantPaymentConnection(input: unknown): TenantPaymentConnectionResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, reason: 'input_invalid' }
  const value = input as Partial<TenantPaymentConnectionInput>
  const requiredStrings = [value.tenantId, value.workspaceId, value.tenantWorkspaceId, value.connectionWorkspaceId]
  if (requiredStrings.some((item) => typeof item !== 'string' || item.trim().length === 0)) return { ok: false, reason: 'input_invalid' }
  if (value.tenantWorkspaceId !== value.workspaceId) return { ok: false, reason: 'tenant_workspace_mismatch' }
  if (value.connectionWorkspaceId !== value.workspaceId) return { ok: false, reason: 'workspace_mismatch' }
  if (!isPaymentProvider(value.provider)) return { ok: false, reason: 'provider_invalid' }
  if (value.mode !== 'test' && value.mode !== 'live') return { ok: false, reason: 'mode_invalid' }
  if (value.mode === 'live' && value.releaseGateOpen !== true) return { ok: false, reason: 'live_gate_closed' }
  return { ok: true, scope: 'tenant', provider: value.provider, mode: value.mode }
}
