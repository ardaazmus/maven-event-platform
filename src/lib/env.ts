// M11.1 — env schema, missing secret fail-fast, no db:push
export const requiredEnv = ['DATABASE_URL'] as const
export const optionalEnv = ['MEDIA_ROOT','SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASSWORD','SMTP_FROM','MAVENFORMS_DANGEROUS_ACTION_PEPPER','STRIPE_SECRET','PAYMENT_LIVE_ENABLED','MAVENFORMS_R10_PRODUCTION_EVIDENCE','MAVENFORMS_RUNTIME_ENV','MAVENFORMS_PAYMENT_ENCRYPTION_KEY','MAVENFORMS_PAYMENT_ENCRYPTION_KEY_ID','MAVENFORMS_PAYMENT_WORKER_SECRET','MAVENFORMS_EMAIL_ENCRYPTION_KEY','MAVENFORMS_EMAIL_ENCRYPTION_KEY_ID','MAVENFORMS_EMAIL_UNSUBSCRIBE_SECRET','MAVENFORMS_EMAIL_WORKER_SECRET','MAVENFORMS_PARASUT_ENCRYPTION_KEY','MAVENFORMS_PARASUT_ENCRYPTION_KEY_ID','PARASUT_OAUTH_CLIENT_ID','PARASUT_OAUTH_CLIENT_SECRET','MAVENFORMS_PARASUT_REDIRECT_URI'] as const

export type AppEnvironment = 'local' | 'staging' | 'production'

export function resolveAppEnvironment(env: Record<string, string | undefined> = process.env): AppEnvironment {
  if (env.NODE_ENV === 'production' || env.MAVENFORMS_RUNTIME_ENV === 'production') return 'production'
  if (env.MAVENFORMS_RUNTIME_ENV === 'staging') return 'staging'
  return 'local'
}

export function validateEnv(env: Record<string,string|undefined> = process.env): { ok: boolean; missing: string[] } {
  const missing = requiredEnv.filter(k => !env[k])
  return { ok: missing.length===0, missing }
}

if (typeof window === 'undefined') {
  const { ok, missing } = validateEnv()
  if (!ok) {
    // ponytail: fail-fast in production, warn in dev
    const msg = `Missing required env: ${missing.join(', ')}`
    if (process.env.NODE_ENV === 'production') throw new Error(msg)
    else console.warn(msg)
  }
}
