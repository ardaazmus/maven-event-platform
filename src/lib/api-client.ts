// MavenForms API client

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const TOKEN_KEY = 'mavenforms_token'

type ApiPayload = {
  data?: unknown
  meta?: unknown
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setStoredToken(token: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch {}
}

// Track if we've already dispatched an unauthorized event to avoid loops
let unauthorizedDispatched = false

async function requestJson(
  path: string,
  options?: RequestInit & { skipAuth?: boolean }
): Promise<ApiPayload> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  }

  // Attach Authorization header if we have a token (unless skipAuth)
  if (!options?.skipAuth) {
    const token = getStoredToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  let res: Response
  try {
    res = await fetch(path, {
      ...options,
      headers,
      credentials: 'include', // Changed from 'same-origin' to 'include' for cross-origin preview domains
    })
  } catch (fetchErr: any) {
    throw new ApiError(`Ağ hatası: ${fetchErr.message || 'bağlanılamadı'}`, 0)
  }

  if (!res.ok) {
    let message = `İstek başarısız (${res.status})`
    try {
      const data = await res.json()
      if (data.error) message = data.error
    } catch {}

    // Only handle 401 for authenticated requests (not login itself)
    if (res.status === 401 && !options?.skipAuth) {
      // Check if we actually have a token - if yes but got 401, token is invalid
      const token = getStoredToken()
      if (token) {
        // Token is invalid - clear it and redirect to login
        setStoredToken(null)
        if (!unauthorizedDispatched) {
          unauthorizedDispatched = true
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mavenforms:unauthorized'))
            // Reset flag after a delay to allow re-login
            setTimeout(() => { unauthorizedDispatched = false }, 2000)
          }
        }
      }
    }
    throw new ApiError(message, res.status)
  }

  const data = await res.json()
  return data as ApiPayload
}

export async function api<T = any>(
  path: string,
  options?: RequestInit & { skipAuth?: boolean }
): Promise<T> {
  const data = await requestJson(path, options)
  return data.data as T
}

export type ApiEnvelope<T, M> = {
  data: T
  meta: M
}

export async function apiWithMeta<T, M>(
  path: string,
  options?: RequestInit & { skipAuth?: boolean }
): Promise<ApiEnvelope<T, M>> {
  const payload = await requestJson(path, options)
  return {
    data: payload.data as T,
    meta: payload.meta as M,
  }
}
