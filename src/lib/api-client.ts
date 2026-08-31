// MavenForms API client

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const TOKEN_KEY = 'mavenforms_token'

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

export async function api<T = any>(
  path: string,
  options?: RequestInit & { skipAuth?: boolean }
): Promise<T> {
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

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: 'same-origin',
  })

  if (!res.ok) {
    let message = `İstek başarısız (${res.status})`
    try {
      const data = await res.json()
      if (data.error) message = data.error
    } catch {}
    if (res.status === 401 && !options?.skipAuth) {
      // Token invalid or missing - clear and redirect to login
      setStoredToken(null)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mavenforms:unauthorized'))
      }
    }
    throw new ApiError(message, res.status)
  }

  const data = await res.json()
  return data.data as T
}
