export const COOKIE_NAME = 'agrichain_session'

export function readSessionCookie(request) {
  const cookieHeader = request.headers.cookie ?? ''
  const entry = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))
  return entry ? decodeURIComponent(entry.slice(COOKIE_NAME.length + 1)) : null
}

export function createRequireAuth(authService) {
  return (request, response, next) => {
    const token = readSessionCookie(request)
    const user = token ? authService.findUserBySession(token) : null
    if (!user) return response.status(401).json({ error: 'Sign in to continue.' })
    request.authUser = user
    request.authToken = token
    next()
  }
}

export function setSessionCookie(response, token, lifetimeMs, secure) {
  response.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api',
    maxAge: lifetimeMs,
  })
}

export function clearSessionCookie(response, secure) {
  response.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api',
  })
}

