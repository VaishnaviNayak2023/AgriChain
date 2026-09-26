export type UserRole = 'farmer' | 'wholesaler' | 'retailer' | 'consumer' | 'regulator'

export interface AuthUser {
  id: string
  fullName: string
  email: string
  phone: string | null
  role: UserRole
  farmName: string
  farmLocation: string
  latitude: number | null
  longitude: number | null
  createdAt: string
}

interface AuthResponse {
  user: AuthUser
}

async function request<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(path, {
    method: body ? 'POST' : 'GET',
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const result = await response.json().catch(() => ({})) as { error?: string } & T
  if (!response.ok) throw new Error(result.error ?? 'Something went wrong. Please try again.')
  return result
}

export const authApi = {
  register: (input: {
    fullName: string
    email: string
    phone: string
    role: UserRole
    farmName: string
    farmLocation: string
    password: string
    termsAccepted: boolean
  }) => request<AuthResponse>('/api/auth/register', input),
  login: (input: { email: string; password: string; rememberMe: boolean }) =>
    request<AuthResponse>('/api/auth/login', input),
  currentUser: () => request<AuthResponse>('/api/auth/me'),
  logout: () => request<{ message: string }>('/api/auth/logout', {}),
}
