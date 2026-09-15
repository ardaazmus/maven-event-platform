import { createPublicMediaToken } from '@/lib/public-media-token'
import { isPaymentCurrency, parsePaymentAmount, type PaymentCurrency } from '@/lib/payment-money'
import { sanitizePublicInvoiceFormConfig } from '@/lib/invoice-form-config'
import { normalizeFieldConfig, normalizeFieldDecoration, normalizeFieldLayout } from '@/lib/form-document'

// PublicFormSnapshot allowlist — single source of truth for public GET
// Only fields listed here may be returned to anonymous callers.
// Never spread Prisma objects directly.

export const FORBIDDEN_PUBLIC_KEYS = [
  'workspaceId','workspace','ownerId','createdById','owner','member','userId','memberId',
  'password','secret','token','cookie','session','refreshToken',
  'audit','integration','smtp','private','draft','deletedAt',
  'internal','stack','trace','sql','dbPath','databaseUrl',
  'createdAt','updatedAt','id','formId',
] as const

function parseJson(value: unknown, fallback: any = {}) {
  if (typeof value !== 'string') return value ?? fallback
  try { return JSON.parse(value) } catch { return fallback }
}

function safeText(value: unknown, max = 2000) {
  return typeof value === 'string' ? value.slice(0, max) : null
}

function safeColor(value: unknown, fallback: string) {
  return typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value) ? value : fallback
}

const PUBLIC_PAYMENT_PROVIDERS = ['stripe', 'iyzico'] as const
type PublicPaymentProvider = typeof PUBLIC_PAYMENT_PROVIDERS[number]

function safePaymentFieldKey(value: unknown) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(value) ? value : null
}

function sanitizePaymentPolicy(value: unknown) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null

  const policy = value as Record<string, unknown>
  const type = policy.type
  const currency = typeof policy.currency === 'string' ? policy.currency.toUpperCase() : null
  if (!isPaymentCurrency(currency)) return null

  if (type === 'fixed') {
    const amount = policy.amount
    return typeof amount === 'string' && parsePaymentAmount(amount, currency) !== null
      ? { type: 'fixed' as const, amount, currency: currency as PaymentCurrency }
      : null
  }

  const fieldKey = safePaymentFieldKey(policy.fieldKey)
  if (!fieldKey) return null
  if (type === 'field') return { type: 'field' as const, fieldKey, currency: currency as PaymentCurrency }

  if (type !== 'price_table' || typeof policy.prices !== 'object' || policy.prices === null || Array.isArray(policy.prices)) return null
  const prices: Record<string, string> = {}
  for (const [key, amount] of Object.entries(policy.prices as Record<string, unknown>)) {
    if (key.length > 120 || typeof amount !== 'string' || parsePaymentAmount(amount, currency) === null) return null
    prices[key] = amount
  }
  return Object.keys(prices).length > 0
    ? { type: 'price_table' as const, fieldKey, currency: currency as PaymentCurrency, prices }
    : null
}

function sanitizePublicPaymentConfig(paymentConfig: any | null) {
  if (!paymentConfig || paymentConfig.enabled !== true) return null
  const provider = PUBLIC_PAYMENT_PROVIDERS.includes(paymentConfig.provider as PublicPaymentProvider)
    ? paymentConfig.provider as PublicPaymentProvider
    : null
  const pricingPolicy = sanitizePaymentPolicy(parseJson(paymentConfig.pricingPolicyJson, paymentConfig.pricingPolicy))
  if (!provider || !pricingPolicy) return null
  return { enabled: true, provider, pricingPolicy }
}

// For public form, we intentionally expose slug as opaque public identifier
// and fieldKey as public field identifier. Internal cuid `id` and `formId` are stripped.

export function sanitizePublicFields(fields: any[]) {
  return fields.map((f: any) => ({
    fieldKey: f.fieldKey,
    type: f.type,
    label: f.label,
    description: f.description ?? null,
    placeholder: f.placeholder ?? null,
    helpText: f.helpText ?? null,
    required: !!f.required,
    readOnly: !!f.readOnly,
    defaultValue: f.defaultValue ?? null,
    config: parseJson(f.config),
    // also handle legacy configJson string
    ...(f.configJson ? { config: parseJson(f.configJson) } : {}),
  })).map(({ config, ...rest }: any) => ({ ...rest, config })) // ensure config merged
}

function sanitizePublicFieldConfig(value: unknown, slug: string) {
  const config = normalizeFieldConfig(value)
  const { mediaAssetId: _mediaAssetId, decoration: rawDecoration, ...safeConfig } = config
  const decoration = normalizeFieldDecoration(rawDecoration)
  if (!decoration) return { ...safeConfig, ...(config.layout ? { layout: normalizeFieldLayout(config.layout) } : {}) }
  const publicDecoration = {
    source: decoration.source,
    position: decoration.position,
    size: decoration.size,
    ...(decoration.iconName ? { iconName: decoration.iconName } : {}),
    ...(decoration.altText ? { altText: decoration.altText } : {}),
    decorative: decoration.decorative === true,
    ...(decoration.source === 'media' && decoration.mediaAssetId
      ? { mediaUrl: `/api/public/forms/${encodeURIComponent(slug)}/media/${createPublicMediaToken(decoration.mediaAssetId, slug)}` }
      : {}),
  }
  return { ...safeConfig, ...(config.layout ? { layout: normalizeFieldLayout(config.layout) } : {}), decoration: publicDecoration }
}

function sanitizeFieldsForSnapshot(fields: any[], slug: string) {
  return fields.map((f: any) => ({
    fieldKey: f.fieldKey,
    type: f.type,
    label: f.label,
    description: f.description ?? null,
    placeholder: f.placeholder ?? null,
    helpText: f.helpText ?? null,
    required: !!f.required,
    readOnly: !!f.readOnly,
    defaultValue: f.defaultValue ?? null,
    config: sanitizePublicFieldConfig(parseJson(f.configJson), slug),
  }))
}

function safePublicUrl(value: unknown, slug: string) {
  if (typeof value !== 'string' || value.length > 2048) return null
  if (value.startsWith(`/api/media/`)) {
    const match = value.match(/^\/api\/media\/([^/?]+)(?:\?.*)?$/)
    return match ? `/api/public/forms/${encodeURIComponent(slug)}/media/${createPublicMediaToken(match[1], slug)}` : null
  }
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

export function sanitizeAppearance(appearance: any | null, slug = '') {
  if (!appearance) return null
  // Explicit allowlist — strip id, formId, createdAt, updatedAt
  let footerLinks: any[] = []
  try { footerLinks = appearance.footerLinks ? JSON.parse(appearance.footerLinks) : [] } catch { footerLinks = [] }
  return {
    headerEnabled: !!appearance.headerEnabled,
    headerLogoUrl: appearance.headerLogoMediaId
      ? `/api/public/forms/${encodeURIComponent(slug)}/media/${createPublicMediaToken(appearance.headerLogoMediaId, slug)}`
      : safePublicUrl(appearance.headerLogoUrl, slug),
    headerLogoAlt: safeText(appearance.headerLogoAlt, 200),
    headerLogoWidth: typeof appearance.headerLogoWidth === 'number' ? Math.max(32, Math.min(800, appearance.headerLogoWidth)) : null,
    headerTitle: safeText(appearance.headerTitle, 300),
    headerSubtitle: safeText(appearance.headerSubtitle, 500),
    headerDescription: safeText(appearance.headerDescription, 2000),
    headerBgColor: safeColor(appearance.headerBgColor, '#ffffff'),
    headerBgImage: appearance.headerBgMediaId
      ? `/api/public/forms/${encodeURIComponent(slug)}/media/${createPublicMediaToken(appearance.headerBgMediaId, slug)}`
      : safePublicUrl(appearance.headerBgImage, slug),
    headerTextColor: safeColor(appearance.headerTextColor, '#1a1a1a'),
    headerAlign: ['left', 'center', 'right'].includes(appearance.headerAlign) ? appearance.headerAlign : 'center',
    headerPadding: typeof appearance.headerPadding === 'number' ? Math.max(0, Math.min(128, appearance.headerPadding)) : 32,
    contactBarEnabled: !!appearance.contactBarEnabled,
    contactBarBgColor: safeColor(appearance.contactBarBgColor, '#e31e24'),
    contactBarTextColor: safeColor(appearance.contactBarTextColor, '#ffffff'),
    contactEmail: safeText(appearance.contactEmail, 320),
    contactPhone: safeText(appearance.contactPhone, 80),
    contactAddress: safeText(appearance.contactAddress, 500),
    socialInstagram: safePublicUrl(appearance.socialInstagram, slug),
    socialLinkedin: safePublicUrl(appearance.socialLinkedin, slug),
    socialTwitter: safePublicUrl(appearance.socialTwitter, slug),
    socialFacebook: safePublicUrl(appearance.socialFacebook, slug),
    socialYoutube: safePublicUrl(appearance.socialYoutube, slug),
    footerEnabled: !!appearance.footerEnabled,
    footerLogoUrl: appearance.footerLogoMediaId
      ? `/api/public/forms/${encodeURIComponent(slug)}/media/${createPublicMediaToken(appearance.footerLogoMediaId, slug)}`
      : safePublicUrl(appearance.footerLogoUrl, slug),
    footerText: safeText(appearance.footerText, 1000),
    footerBgColor: safeColor(appearance.footerBgColor, '#1a1a1a'),
    footerTextColor: safeColor(appearance.footerTextColor, '#ffffff'),
    footerLinks: Array.isArray(footerLinks) ? footerLinks.map(link => ({
      label: safeText(link?.label, 120),
      url: safePublicUrl(link?.url, slug),
    })).filter(link => link.label && link.url) : [],
    footerPadding: typeof appearance.footerPadding === 'number' ? Math.max(0, Math.min(128, appearance.footerPadding)) : 24,
    customCss: null,
  }
}

export function sanitizeTheme(theme: any | null) {
  if (!theme) return null
  const tokens = parseJson(theme.tokensJson, {}) as Record<string, unknown>
  return {
    tokens: {
      primary: safeColor(tokens.primary, '#10b981'),
      background: safeColor(tokens.background, '#f9fafb'),
      text: safeColor(tokens.text, '#1a1a1a'),
      error: safeColor(tokens.error, '#dc2626'),
      success: safeColor(tokens.success, '#16a34a'),
      warning: safeColor(tokens.warning, '#d97706'),
    },
    font: typeof theme.font === 'string' && /^[a-zA-Z0-9 ,.'-]{1,120}$/.test(theme.font) ? theme.font : 'Inter',
    radius: typeof theme.radius === 'number' ? Math.max(0, Math.min(3, theme.radius)) : 0.625,
    customCss: null,
  }
}

export function sanitizePublicForm(form: any) {
  const settings = parseJson(form.settingsJson, {}) as Record<string, unknown>
  // Only allowlisted settings keys
  const publicSettings: any = {}
  if (settings.successMessage !== undefined) publicSettings.successMessage = settings.successMessage
  if (settings.submitButtonText !== undefined) publicSettings.submitButtonText = settings.submitButtonText
  if (settings.captcha !== undefined) publicSettings.captcha = settings.captcha
  if (settings.responseLimit !== undefined) publicSettings.responseLimit = settings.responseLimit
  if (settings.locale !== undefined) publicSettings.locale = settings.locale
  if (settings.closedMessage !== undefined) publicSettings.closedMessage = settings.closedMessage
  publicSettings.invoice = sanitizePublicInvoiceFormConfig(settings)

  return {
    slug: form.slug,
    title: form.title,
    description: form.description ?? null,
    status: form.status,
    settings: publicSettings,
    fields: sanitizeFieldsForSnapshot(form.fields || [], form.slug),
    theme: sanitizeTheme(form.themes?.[0] ?? form.theme ?? null),
    appearance: sanitizeAppearance(form.appearance ?? null, form.slug),
    payment: sanitizePublicPaymentConfig(form.paymentConfig ?? null),
  }
}

// Helper for tests: scan object for forbidden keys recursively
export function containsForbiddenKeys(obj: any, forbidden: readonly string[] = FORBIDDEN_PUBLIC_KEYS): string[] {
  const found: string[] = []
  const seen = new Set<any>()
  const forbiddenLower = forbidden.map(f => f.toLowerCase())
  function scan(o: any, path: string) {
    if (!o || typeof o !== 'object' || seen.has(o)) return
    seen.add(o)
    if (Array.isArray(o)) { o.forEach((v,i)=>scan(v,`${path}[${i}]`)); return }
    for (const k of Object.keys(o)) {
      const lower = k.toLowerCase()
      // Exact match only — prevents 'tokens' matching 'token'
      if (forbiddenLower.includes(lower)) {
        if (lower === 'id' && (k === 'fieldKey' || k === 'slug')) { /* skip */ }
        else { found.push(`${path}.${k}`); continue }
      }
      // Also catch publicToken explicitly (already in list) but lower includes token substring for publicToken only
      if (lower === 'publictoken') { found.push(`${path}.${k}`); continue }
      scan(o[k], `${path}.${k}`)
    }
  }
  scan(obj, 'root')
  return found
}
