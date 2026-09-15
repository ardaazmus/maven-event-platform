type UrlSafetyResult =
  | { allowed: true; normalizedUrl: string }
  | { allowed: false; reason: 'input_invalid' | 'scheme_invalid' | 'host_invalid' | 'private_host' | 'credentials_not_allowed' | 'fragment_not_allowed' }

type UrlSafetyOptions = { allowLocalhostHttp?: boolean }

type UrlSafetyFailure = { allowed: false; reason: 'input_invalid' | 'scheme_invalid' | 'host_invalid' | 'private_host' | 'credentials_not_allowed' | 'fragment_not_allowed' }

type RedirectAllowlist = { origin: string; path: string }

type RedirectResult =
  | { allowed: true; normalizedUrl: string }
  | { allowed: false; reason: 'input_invalid' | 'redirect_allowlist_invalid' | 'redirect_origin_mismatch' | 'redirect_path_mismatch' | 'redirect_fragment_not_allowed' }

type CallbackStateInput = {
  receivedState: unknown
  expectedState: unknown
  consumed: unknown
  expiresAtMs: unknown
  nowMs: unknown
  bindingMatches: unknown
}

type CallbackStateResult =
  | { allowed: true }
  | { allowed: false; reason: 'state_missing' | 'state_mismatch' | 'state_replayed' | 'state_expired' | 'state_binding_mismatch' }

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  const [first, second] = parts
  return first === 0 || first === 10 || first === 127 || (first === 100 && second >= 64 && second <= 127) || (first === 169 && second === 254) || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168) || (first === 198 && (second === 18 || second === 19)) || first >= 224
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  return host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.home.arpa') || host === 'metadata.google.internal' || host === '169.254.169.254' || host.includes(':') || isPrivateIpv4(host)
}

function parseExternalUrl(input: unknown, options: UrlSafetyOptions = {}): URL | UrlSafetyFailure {
  if (typeof input !== 'string' || input.length === 0 || input.length > 2048) return { allowed: false, reason: 'input_invalid' }
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return { allowed: false, reason: 'input_invalid' }
  }
  const localTestOrigin = options.allowLocalhostHttp === true && url.protocol === 'http:' && url.hostname.toLowerCase() === 'localhost'
  if (url.protocol !== 'https:' && !localTestOrigin) return { allowed: false, reason: 'scheme_invalid' }
  if (!url.hostname || (!localTestOrigin && isPrivateHost(url.hostname))) return { allowed: false, reason: 'private_host' }
  if (url.username || url.password) return { allowed: false, reason: 'credentials_not_allowed' }
  if (url.hash) return { allowed: false, reason: 'fragment_not_allowed' }
  return url
}

/** Validates an external provider/callback URL without performing DNS or network I/O. */
export function validateExternalHttpsUrl(input: unknown, options: UrlSafetyOptions = {}): UrlSafetyResult {
  const parsed = parseExternalUrl(input, options)
  return parsed instanceof URL ? { allowed: true, normalizedUrl: parsed.toString() } : parsed
}

/** Allows only the exact preconfigured callback origin and path; query parameters remain provider-controlled. */
export function validateAllowedRedirectUrl(input: unknown, allowlist: RedirectAllowlist): RedirectResult {
  if (!allowlist || typeof allowlist.origin !== 'string' || typeof allowlist.path !== 'string' || !allowlist.path.startsWith('/')) return { allowed: false, reason: 'redirect_allowlist_invalid' }
  const target = parseExternalUrl(input)
  const configured = parseExternalUrl(allowlist.origin)
  if (!(target instanceof URL)) return target.reason === 'fragment_not_allowed' ? { allowed: false, reason: 'redirect_fragment_not_allowed' } : { allowed: false, reason: 'input_invalid' }
  if (!(configured instanceof URL)) return { allowed: false, reason: 'redirect_allowlist_invalid' }
  if (target.origin !== configured.origin) return { allowed: false, reason: 'redirect_origin_mismatch' }
  if (target.pathname !== allowlist.path) return { allowed: false, reason: 'redirect_path_mismatch' }
  return { allowed: true, normalizedUrl: target.toString() }
}

/** Enforces one-time, expiring, same-context callback state without exposing the opaque value. */
export function evaluateCallbackState(input: CallbackStateInput): CallbackStateResult {
  if (!input || typeof input.receivedState !== 'string' || input.receivedState.length === 0 || typeof input.expectedState !== 'string' || input.expectedState.length === 0) return { allowed: false, reason: 'state_missing' }
  if (input.receivedState !== input.expectedState) return { allowed: false, reason: 'state_mismatch' }
  if (input.consumed === true) return { allowed: false, reason: 'state_replayed' }
  if (typeof input.expiresAtMs !== 'number' || typeof input.nowMs !== 'number' || input.expiresAtMs <= input.nowMs) return { allowed: false, reason: 'state_expired' }
  if (input.bindingMatches !== true) return { allowed: false, reason: 'state_binding_mismatch' }
  return { allowed: true }
}
