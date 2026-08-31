// MavenForms - Shared types

export type FormStatus = 'draft' | 'published' | 'paused' | 'archived'
export type SubmissionStatus = 'new' | 'reviewing' | 'approved' | 'rejected' | 'spam' | 'archived'
export type PaymentStatus = 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'partially_refunded'
export type UserRole = 'owner' | 'admin' | 'form_manager' | 'analyst' | 'reviewer' | 'viewer'
export type FieldType =
  | 'text' | 'paragraph' | 'email' | 'phone' | 'number' | 'date' | 'time'
  | 'checkbox' | 'radio' | 'select' | 'dropdown' | 'file' | 'address'
  | 'signature' | 'rating' | 'price' | 'matrix' | 'section' | 'page_break'
  | 'media' | 'hidden' | 'captcha'

export interface User {
  id: string
  email: string
  name: string | null
  avatarUrl?: string | null
  role: UserRole
  locale: string
  timezone: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  plan: string
  locale: string
  timezone: string
}

export interface SessionContext {
  user: User
  workspace: Workspace
}

export interface FormField {
  id: string
  fieldKey: string
  type: FieldType
  label: string
  description?: string | null
  placeholder?: string | null
  helpText?: string | null
  required: boolean
  unique: boolean
  readOnly: boolean
  hidden: boolean
  adminOnly: boolean
  encrypted: boolean
  defaultValue?: string | null
  config: FieldConfig
  sortOrder: number
}

export interface FieldConfig {
  options?: Array<{ label: string; value: string }>
  min?: number
  max?: number
  maxLength?: number
  pattern?: string
  allowedTypes?: string[]
  maxSize?: number
  style?: string
  lowLabel?: string
  highLabel?: string
  columns?: number
  rows?: Array<{ label: string }>
  multiple?: boolean
}

export interface FormListItem {
  id: string
  title: string
  description?: string | null
  slug: string
  status: FormStatus
  folder?: { id: string; name: string; color: string } | null
  tags: Array<{ id: string; name: string; color: string }>
  owner: { id: string; name: string | null; email: string }
  submissionCount: number
  todaySubmissionCount: number
  responseLimit?: number | null
  createdAt: string
  updatedAt: string
  startDate?: string | null
  endDate?: string | null
}

export interface FormDetail extends FormListItem {
  settings: FormSettings
  fields: FormField[]
  themes: Theme[]
  notifications: Notification[]
  logicRules: LogicRule[]
  creator: { id: string; name: string | null; email: string }
  _count: { submissions: number }
}

export interface FormSettings {
  successMessage?: string
  submitButtonText?: string
  captcha?: boolean
  responseLimit?: number
  locale?: string
  timezone?: string
  closedMessage?: string
}

export interface Theme {
  id: string
  name: string
  tokens: ThemeTokens
  customCss?: string | null
  font: string
  radius: number
  version: number
}

export interface ThemeTokens {
  primary?: string
  background?: string
  text?: string
  error?: string
  success?: string
  warning?: string
}

export interface Notification {
  id: string
  name: string
  type: 'admin' | 'user_confirmation' | 'webhook'
  enabled: boolean
  config: {
    to?: string
    cc?: string
    bcc?: string
    subject?: string
    body?: string
    condition?: string
  }
}

export interface LogicRule {
  id: string
  name?: string | null
  priority: number
  conditions: {
    type: 'all' | 'any'
    conditions: Array<{
      field: string
      operator: string
      value: string
    }>
  }
  actions: Array<{
    type: 'show' | 'hide' | 'require' | 'enable' | 'disable' | 'assign' | 'redirect' | 'notify'
    target?: string
    value?: string
  }>
  enabled: boolean
}

export interface Submission {
  id: string
  status: SubmissionStatus
  paymentStatus?: PaymentStatus | null
  locale: string
  source: string
  submittedAt: string
  createdAt: string
  submitter?: { id: string; name: string | null; email: string } | null
  values: Array<{
    id: string
    fieldId: string
    value: { value: any }
    normalizedText?: string | null
    field: FormField
  }>
}

export interface DashboardData {
  stats: {
    totalForms: number
    publishedForms: number
    todaySubmissions: number
    pendingApprovals: number
    failedNotifications: number
    paymentTotal: number
  }
  recentForms: FormListItem[]
  recentSubmissions: Array<{
    id: string
    status: SubmissionStatus
    paymentStatus?: PaymentStatus | null
    submittedAt: string
    source: string
    form: { id: string; title: string; slug: string }
    name: string
    email: string | null
  }>
  activityFeed: Array<{
    id: string
    action: string
    resourceType: string
    resourceId: string
    actor: { id: string; name: string | null; email: string } | null
    createdAt: string
  }>
  trend: Array<{ date: string; label: string; count: number }>
  statusDistribution: Array<{ status: string; _count: number }>
  systemAlerts: Array<{
    id: string
    level: 'warning' | 'info' | 'success' | 'error'
    title: string
    description: string
    time: string
  }>
}

export interface Folder {
  id: string
  name: string
  color: string
  parentId?: string | null
  sortOrder: number
  formCount: number
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface Integration {
  id: string
  provider: string
  name: string
  status: 'connected' | 'disconnected' | 'error'
  config: any
}

export type AppView =
  | 'login'
  | 'dashboard'
  | 'forms'
  | 'builder'
  | 'submissions'
  | 'reports'
  | 'settings'
  | 'audit'
  | 'users'
