// MavenForms API client

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T = any>(
  path: string,
  options?: RequestInit & { skipAuth?: boolean }
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    credentials: 'same-origin',
  })

  if (!res.ok) {
    let message = `İstek başarısız (${res.status})`
    try {
      const data = await res.json()
      if (data.error) message = data.error
    } catch {}
    if (res.status === 401 && !options?.skipAuth) {
      // Redirect to login handled by store
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mavenforms:unauthorized'))
      }
    }
    throw new ApiError(message, res.status)
  }

  const data = await res.json()
  return data.data as T
}
