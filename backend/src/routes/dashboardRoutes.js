import { Router } from 'express'
import { readFile, stat } from 'node:fs/promises'
import { basename } from 'node:path'
import { rateLimit } from 'express-rate-limit'
import { createRequireAuth } from '../middleware/requireAuth.js'
import { analysisResultSchema, createBatchSchema, profileSchema, updateBatchSchema } from '../schemas/dashboardSchemas.js'
import { createDashboardService } from '../services/dashboardService.js'
import { resolveUploadedImage, uploadImage } from '../services/uploadService.js'

function validate(response, result) {
  return response.status(400).json({
    error: result.error.issues[0]?.message ?? 'Check the submitted information.',
    fields: result.error.issues.map(({ path, message }) => ({ field: path.join('.'), message })),
  })
}

export function createDashboardRouter(db, authService) {
  const router = Router()
  const dashboard = createDashboardService(db)
  router.use(createRequireAuth(authService))
  router.use((request, response, next) => {
    if (request.authUser.role !== 'farmer') return response.status(403).json({ error: 'The farmer dashboard is only available to farmer accounts.' })
    next()
  })

  router.get('/overview', (request, response) => response.json(dashboard.getOverview(request.authUser.id)))

  router.post('/uploads', uploadImage.single('image'), (request, response) => {
    if (!request.file) return response.status(400).json({ error: 'Choose an image to upload.' })
    return response.status(201).json({ imageUrl: `/uploads/${request.file.filename}` })
  })

  router.get('/batches', (request, response) => {
    const page = Math.max(1, Math.min(100_000, Number.parseInt(request.query.page, 10) || 1))
    const pageSize = Math.max(1, Math.min(50, Number.parseInt(request.query.pageSize, 10) || 10))
    const result = dashboard.listBatches(request.authUser.id, {
      search: String(request.query.search ?? ''),
      status: String(request.query.status ?? ''),
      sort: String(request.query.sort ?? 'created_at'),
      direction: String(request.query.direction ?? 'desc'),
      page,
      pageSize,
    })
    response.json(result)
  })

  router.post('/batches', (request, response) => {
    const result = createBatchSchema.safeParse(request.body)
    if (!result.success) return validate(response, result)
    const batch = dashboard.createBatch(request.authUser.id, result.data)
    return response.status(201).json({ batch })
  })

  router.post('/batches/:id/analyze', async (request, response) => {
    if (!process.env.AI_SERVICE_URL) return response.status(503).json({ error: 'AI analysis is not configured on this server.' })
    const batch = dashboard.getBatch(request.authUser.id, request.params.id)
    if (!batch) return response.status(404).json({ error: 'Batch not found.' })
    if (!batch.imageUrl) return response.status(400).json({ error: 'Upload a produce image before requesting analysis.' })

    const imagePath = resolveUploadedImage(batch.imageUrl)
    if (!imagePath) return response.status(400).json({ error: 'The batch image is not stored by this service.' })

    try {
      await stat(imagePath)
      const image = await readFile(imagePath)
      const mime = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' }[basename(imagePath).split('.').pop()]
      const form = new FormData()
      form.append('file', new Blob([image], { type: mime }), basename(imagePath))
      const baseUrl = process.env.AI_SERVICE_URL.endsWith('/') ? process.env.AI_SERVICE_URL : `${process.env.AI_SERVICE_URL}/`
      const headers = process.env.AI_SERVICE_TOKEN ? { Authorization: `Bearer ${process.env.AI_SERVICE_TOKEN}` } : undefined
      const upstream = await fetch(new URL('analyze', baseUrl), { method: 'POST', body: form, headers, signal: AbortSignal.timeout(30_000) })
      if (!upstream.ok) return response.status(502).json({ error: 'The configured AI service could not complete this analysis.' })
      const parsed = analysisResultSchema.safeParse(await upstream.json())
      if (!parsed.success) return response.status(502).json({ error: 'The AI service returned an invalid analysis response.' })
      const analysis = dashboard.saveAnalysis(request.authUser.id, batch.id, parsed.data)
      return response.status(201).json({ analysis })
    } catch {
      return response.status(502).json({ error: 'The configured AI service could not be reached.' })
    }
  })

  router.get('/passports', (request, response) => response.json({ passports: dashboard.listPassports(request.authUser.id) }))

  router.post('/batches/:id/passport', (request, response) => {
    const result = dashboard.createPassport(request.authUser.id, request.params.id)
    if (result.error === 'not_found') return response.status(404).json({ error: 'Batch not found.' })
    if (result.error === 'not_verified') return response.status(409).json({ error: 'A passport requires a verified batch and blockchain transaction.' })
    return response.status(201).json(result)
  })

  router.put('/batches/:id', (request, response) => {
    const result = updateBatchSchema.safeParse(request.body)
    if (!result.success) return validate(response, result)
    const batch = dashboard.updateBatch(request.authUser.id, request.params.id, result.data)
    return batch ? response.json({ batch }) : response.status(404).json({ error: 'Batch not found.' })
  })

  router.delete('/batches/:id', (request, response) => {
    const deleted = dashboard.deleteBatch(request.authUser.id, request.params.id)
    return deleted ? response.status(204).end() : response.status(404).json({ error: 'Batch not found.' })
  })

  router.get('/activity', (request, response) => response.json({ activities: dashboard.getActivities(request.authUser.id) }))
  router.get('/analytics/monthly-performance', (request, response) => response.json({ performance: dashboard.getOverview(request.authUser.id).performance }))
  router.get('/analytics/quality-distribution', (request, response) => response.json({ distribution: dashboard.getQualityDistribution(request.authUser.id) }))
  router.get('/analytics/revenue', (request, response) => response.json({ revenue: dashboard.getRevenue(request.authUser.id) }))
  router.get('/farm/location', (request, response) => response.json({ farmLocation: dashboard.getOverview(request.authUser.id).farmLocation }))

  router.put('/profile', (request, response) => {
    const result = profileSchema.safeParse(request.body)
    if (!result.success) return validate(response, result)
    const user = dashboard.updateProfile(request.authUser.id, result.data)
    return response.json({ user })
  })

  router.get('/integrations', (request, response) => response.json(dashboard.getOverview(request.authUser.id).integrations))

  return router
}

export function createPublicPassportRouter(db) {
  const router = Router()
  const dashboard = createDashboardService(db)
  router.get('/:publicId', (request, response) => {
    const passport = dashboard.getPublicPassport(request.params.publicId)
    return passport ? response.json({ passport }) : response.status(404).json({ error: 'Passport not found.' })
  })
  return router
}
