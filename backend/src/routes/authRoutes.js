import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { loginSchema, registerSchema } from '../schemas/authSchemas.js'
import { clearSessionCookie, createRequireAuth, readSessionCookie, setSessionCookie } from '../middleware/requireAuth.js'

const SHORT_SESSION_MS = 8 * 60 * 60 * 1000
const LONG_SESSION_MS = 30 * 24 * 60 * 60 * 1000

function invalidBody(response, validation) {
  return response.status(400).json({
    error: validation.error.issues[0]?.message ?? 'Check the submitted information.',
    fields: validation.error.issues.map(({ path, message }) => ({ field: path.join('.'), message })),
  })
}

export function createAuthRouter(authService, { secureCookies = process.env.NODE_ENV === 'production' } = {}) {
  const router = Router()
  const requireAuth = createRequireAuth(authService)

  const limitAuthAttempts = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Wait a few minutes and try again.' },
  })

  router.post('/register', limitAuthAttempts, async (request, response, next) => {
    const validation = registerSchema.safeParse(request.body)
    if (!validation.success) return invalidBody(response, validation)

    try {
      const user = await authService.register(validation.data)
      const token = authService.createSession(user.id, LONG_SESSION_MS)
      setSessionCookie(response, token, LONG_SESSION_MS, secureCookies)
      return response.status(201).json({ user })
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return response.status(409).json({ error: 'An account with this email already exists.' })
      }
      return next(error)
    }
  })

  router.post('/login', limitAuthAttempts, async (request, response, next) => {
    const validation = loginSchema.safeParse(request.body)
    if (!validation.success) return invalidBody(response, validation)

    try {
      const { email, password, rememberMe } = validation.data
      const user = await authService.authenticate(email, password)
      if (!user) return response.status(401).json({ error: 'Invalid email or password.' })

      const lifetime = rememberMe ? LONG_SESSION_MS : SHORT_SESSION_MS
      const token = authService.createSession(user.id, lifetime)
      setSessionCookie(response, token, lifetime, secureCookies)
      return response.json({ user })
    } catch (error) {
      return next(error)
    }
  })

  router.get('/me', requireAuth, (request, response) => response.json({ user: request.authUser }))

  router.post('/logout', (request, response) => {
    const token = readSessionCookie(request)
    if (token) authService.deleteSession(token)
    clearSessionCookie(response, secureCookies)
    return response.json({ message: 'Signed out.' })
  })

  return router
}
