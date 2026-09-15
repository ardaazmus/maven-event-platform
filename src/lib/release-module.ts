export type ProductModule =
  | 'registration_forms'
  | 'manual_payment_tracking'
  | 'participant_notifications'
  | 'online_payments'
  | 'manual_invoices'
  | 'parasut_invoices'
  | 'transactional_invoice_delivery'
  | 'tenant_byo_connections'
  | 'support_break_glass'
  | 'subscription_billing'

export type ModuleDecision = {
  module: ProductModule
  enabled: boolean
  reason: 'version_entitlement' | 'admin_disabled' | 'security_gate' | 'external_dependency' | 'tenant_suspended'
  scope: 'workspace' | 'form' | 'tenant'
}

export const CAPABILITY_STATUSES = Object.freeze([
  'verified',
  'unknown',
  'unsupported',
  'blocked',
] as const)

export type CapabilityStatus = (typeof CAPABILITY_STATUSES)[number]

/**
 * Carries entitlement and runtime capability evidence separately. A module
 * can be entitled while its provider capability is still unknown or blocked.
 */
export type ModuleCapabilitySnapshot = Readonly<{
  module: ProductModule
  enabled: boolean
  entitlementReason: ModuleDecision['reason']
  scope: ModuleDecision['scope']
  capabilityStatus: CapabilityStatus
  capabilityReason: string
}>

export type ModuleAccessContext = {
  workspaceId: string
  formId: string
  actor: { role: string }
  environment: 'local' | 'staging' | 'production'
}

const MODULE_SCOPE: Record<ProductModule, ModuleDecision['scope']> = {
  registration_forms: 'form',
  manual_payment_tracking: 'form',
  participant_notifications: 'form',
  online_payments: 'form',
  manual_invoices: 'form',
  parasut_invoices: 'form',
  transactional_invoice_delivery: 'form',
  tenant_byo_connections: 'tenant',
  support_break_glass: 'workspace',
  subscription_billing: 'workspace',
}

const PRODUCT_MODULES: readonly ProductModule[] = [
  'registration_forms',
  'manual_payment_tracking',
  'participant_notifications',
  'online_payments',
  'manual_invoices',
  'parasut_invoices',
  'transactional_invoice_delivery',
  'tenant_byo_connections',
  'support_break_glass',
  'subscription_billing',
]

/** Modules that a tenant may receive as an explicit V4 product entitlement. */
export const TENANT_ENTITLED_MODULES: readonly ProductModule[] = Object.freeze([
  'registration_forms',
  'manual_payment_tracking',
  'participant_notifications',
  'online_payments',
  'manual_invoices',
  'parasut_invoices',
  'transactional_invoice_delivery',
])

const V1_OPEN_MODULES = new Set<ProductModule>([
  'registration_forms',
  'manual_payment_tracking',
  'participant_notifications',
])

function isProductModule(value: unknown): value is ProductModule {
  return typeof value === 'string' && PRODUCT_MODULES.includes(value as ProductModule)
}

function isModuleReason(value: unknown): value is ModuleDecision['reason'] {
  return value === 'version_entitlement' || value === 'admin_disabled' || value === 'security_gate'
    || value === 'external_dependency' || value === 'tenant_suspended'
}

function isModuleScope(value: unknown): value is ModuleDecision['scope'] {
  return value === 'workspace' || value === 'form' || value === 'tenant'
}

function isCapabilityStatus(value: unknown): value is CapabilityStatus {
  return typeof value === 'string' && CAPABILITY_STATUSES.includes(value as CapabilityStatus)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Normalizes a server-owned capability read model. Invalid or incomplete
 * evidence returns null so an interface cannot silently present a capability
 * as available.
 */
export function normalizeCapabilitySnapshot(input: unknown): ModuleCapabilitySnapshot | null {
  if (!isRecord(input) || !isProductModule(input.module) || typeof input.enabled !== 'boolean'
    || !isModuleReason(input.entitlementReason) || !isModuleScope(input.scope)
    || !isCapabilityStatus(input.capabilityStatus) || typeof input.capabilityReason !== 'string'
    || input.capabilityReason.trim().length === 0) return null

  return Object.freeze({
    module: input.module,
    enabled: input.enabled,
    entitlementReason: input.entitlementReason,
    scope: input.scope,
    capabilityStatus: input.capabilityStatus,
    capabilityReason: input.capabilityReason.trim(),
  })
}

function createV1Decision(module: ProductModule): ModuleDecision {
  return Object.freeze({
    module,
    enabled: V1_OPEN_MODULES.has(module),
    reason: 'version_entitlement',
    scope: MODULE_SCOPE[module],
  })
}

export const V1_MODULE_DECISIONS: readonly ModuleDecision[] = Object.freeze(
  PRODUCT_MODULES.map(createV1Decision),
)

/**
 * Returns the fixed V1 capability matrix. Release selection is intentionally
 * server-owned in this first phase; request fields cannot override this result.
 */
export function evaluateModuleAccess(_context: ModuleAccessContext): readonly ModuleDecision[] {
  return V1_MODULE_DECISIONS
}
