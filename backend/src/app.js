import express from 'express'
import helmet from 'helmet'
import { UPLOAD_DIR } from './services/uploadService.js'
import { createAuthRouter } from './routes/authRoutes.js'
import { createDashboardRouter, createPublicPassportRouter } from './routes/dashboardRoutes.js'
import { createAuthService } from './services/authService.js'

export function createApp(db, options = {}) {
  const app = express()
  const authService = createAuthService(db)

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(express.json({ limit: '16kb' }))
  app.use('/uploads', express.static(UPLOAD_DIR, { dotfiles: 'deny', index: false, maxAge: '1d' }))
  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))
  app.use('/api/auth', createAuthRouter(authService, options))
  app.use('/api/dashboard', createDashboardRouter(db, authService))
  app.use('/api/public/passports', createPublicPassportRouter(db))
  app.use('/api/*path', (_request, response) => response.status(404).json({ error: 'API route not found.' }))
  app.use((error, _request, response, _next) => {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return response.status(413).json({ error: 'Image must be 5 MB or smaller.' })
    }
    if (error.message === 'Upload a JPG, PNG, WebP, or AVIF image.') {
      return response.status(415).json({ error: error.message })
    }
    if (error.type === 'entity.parse.failed') {
      return response.status(400).json({ error: 'Request body must contain valid JSON.' })
    }
    if (error.type === 'entity.too.large') {
      return response.status(413).json({ error: 'Request body is too large.' })
    }
    console.error('Unhandled API error:', error)
    return response.status(500).json({ error: 'An unexpected server error occurred.' })
  })

  return app
}
