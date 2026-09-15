import type { UserRole } from '@/lib/types'

export type Capability =
  | 'forms.read'
  | 'forms.write'
  | 'submissions.read'
  | 'submissions.update'
  | 'submissions.payment_update'
  | 'submissions.delete'
  | 'members.manage'
  | 'settings.manage'
  | 'integrations.manage'
  | 'billing.manage'
  | 'invoices.read'
  | 'invoices.import'
  | 'audit.read'
  | 'reports.read'
  | 'workspace.dangerous'

export const ROLE_CAPABILITIES: Record<UserRole, readonly Capability[]> = {
  owner: ['forms.read','forms.write','submissions.read','submissions.update','submissions.payment_update','submissions.delete','members.manage','settings.manage','integrations.manage','billing.manage','invoices.read','invoices.import','audit.read','reports.read','workspace.dangerous'],
  admin: ['forms.read','forms.write','submissions.read','submissions.update','submissions.payment_update','submissions.delete','members.manage','settings.manage','integrations.manage','billing.manage','invoices.read','invoices.import','audit.read','reports.read'],
  accounting: ['submissions.read','submissions.payment_update','invoices.read','invoices.import'],
  form_manager: ['forms.read','forms.write','submissions.read','submissions.update','settings.manage','reports.read'],
  analyst: ['forms.read','submissions.read','reports.read','audit.read'],
  reviewer: ['forms.read','submissions.read','submissions.update'],
  viewer: ['forms.read','submissions.read'],
} as const

export function hasCapability(role: UserRole, capability: Capability): boolean {
  const caps = ROLE_CAPABILITIES[role as UserRole]
  if (!caps) return false
  return (caps as readonly string[]).includes(capability)
}

export interface SessionContext {
  user: { id: string; email: string; name: string | null; role: UserRole; [k: string]: any }
  workspace: { id: string; [k: string]: any }
}

export function checkCapability(ctx: SessionContext | null | undefined, capability: Capability): { allowed: boolean; status: 401 | 403 | 200; error?: string } {
  if (!ctx || !ctx.user || !ctx.workspace) {
    return { allowed: false, status: 401, error: 'Unauthorized' }
  }
  const role = ctx.user.role as UserRole
  if (!role || !(role in ROLE_CAPABILITIES)) {
    return { allowed: false, status: 403, error: 'Forbidden' }
  }
  if (hasCapability(role, capability)) {
    return { allowed: true, status: 200 }
  }
  return { allowed: false, status: 403, error: 'Forbidden' }
}

// Named helpers — avoids boolean positional params
export const can = {
  readForms: (ctx: SessionContext | null) => checkCapability(ctx, 'forms.read'),
  writeForms: (ctx: SessionContext | null) => checkCapability(ctx, 'forms.write'),
  readSubmissions: (ctx: SessionContext | null) => checkCapability(ctx, 'submissions.read'),
  updateSubmissions: (ctx: SessionContext | null) => checkCapability(ctx, 'submissions.update'),
  updateSubmissionPayment: (ctx: SessionContext | null) => checkCapability(ctx, 'submissions.payment_update'),
  deleteSubmissions: (ctx: SessionContext | null) => checkCapability(ctx, 'submissions.delete'),
  manageMembers: (ctx: SessionContext | null) => checkCapability(ctx, 'members.manage'),
  manageSettings: (ctx: SessionContext | null) => checkCapability(ctx, 'settings.manage'),
  manageIntegrations: (ctx: SessionContext | null) => checkCapability(ctx, 'integrations.manage'),
  manageBilling: (ctx: SessionContext | null) => checkCapability(ctx, 'billing.manage'),
  readInvoices: (ctx: SessionContext | null) => checkCapability(ctx, 'invoices.read'),
  writeInvoices: (ctx: SessionContext | null) => checkCapability(ctx, 'invoices.import'),
  readAudit: (ctx: SessionContext | null) => checkCapability(ctx, 'audit.read'),
  readReports: (ctx: SessionContext | null) => checkCapability(ctx, 'reports.read'),
  manageDangerousActions: (ctx: SessionContext | null) => checkCapability(ctx, 'workspace.dangerous'),
}
