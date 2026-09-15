export type DisposableTestProfile = Readonly<{
  environment: 'test'
  database: Readonly<{ mode: 'disposable'; name: string; resetOnStart: true }>
  objectStorage: Readonly<{ mode: 'disposable'; namespace: string; cleanupOnFinish: true }>
  mail: Readonly<{ mode: 'sink'; recipientDomain: 'test.invalid'; externalDelivery: false }>
  outboundNetwork: false
  productionMutation: false
}>

export type DisposableTestProfileResult =
  | Readonly<{ ok: true; profile: DisposableTestProfile }>
  | Readonly<{ ok: false; reason: 'input_invalid' | 'secret_forbidden' | 'external_mail_forbidden' | 'production_forbidden' }>

const SAFE_NAME_PATTERN = /^[A-Za-z0-9._-]{1,80}$/
const FORBIDDEN_KEYS = new Set([
  'secretKey',
  'apiKey',
  'api_key',
  'password',
  'privateKey',
  'private_key',
  'smtpPassword',
  'providerToken',
  'credential',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasForbiddenKey(value: Record<string, unknown>): boolean {
  return Object.keys(value).some(key => FORBIDDEN_KEYS.has(key))
}

function isSafeName(value: unknown): value is string {
  return typeof value === 'string' && SAFE_NAME_PATTERN.test(value)
}

/** Creates an isolated local-test profile; it never configures a real mail or storage provider. */
export function createDisposableTestProfile(input: unknown): DisposableTestProfileResult {
  if (!isRecord(input)) return { ok: false, reason: 'input_invalid' }
  if (hasForbiddenKey(input)) return { ok: false, reason: 'secret_forbidden' }
  if (Object.keys(input).some(key => !['databaseName', 'objectStorageNamespace', 'mailRecipientDomain', 'mailMode', 'environment'].includes(key))) {
    return { ok: false, reason: 'input_invalid' }
  }
  if (input.environment !== 'test') return { ok: false, reason: 'production_forbidden' }
  if (!isSafeName(input.databaseName) || !isSafeName(input.objectStorageNamespace)) {
    return { ok: false, reason: 'input_invalid' }
  }
  if (input.mailMode !== 'sink' || input.mailRecipientDomain !== 'test.invalid') {
    return { ok: false, reason: 'external_mail_forbidden' }
  }

  return {
    ok: true,
    profile: {
      environment: 'test',
      database: { mode: 'disposable', name: input.databaseName, resetOnStart: true },
      objectStorage: { mode: 'disposable', namespace: input.objectStorageNamespace, cleanupOnFinish: true },
      mail: { mode: 'sink', recipientDomain: 'test.invalid', externalDelivery: false },
      outboundNetwork: false,
      productionMutation: false,
    },
  }
}
