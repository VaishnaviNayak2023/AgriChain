import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { createDatabase } from '../src/db/database.js'
import { seedDevelopmentData } from '../src/scripts/seedDevelopment.js'
import { createDashboardService } from '../src/services/dashboardService.js'

let db
let app

async function createFarmer(email, fullName = 'Farmer Test') {
  const client = request.agent(app)
  const response = await client.post('/api/auth/register').send({
    fullName,
    email,
    role: 'farmer',
    password: 'secure-harvest-password-92',
    termsAccepted: true,
  })
  assert.equal(response.status, 201)
  return client
}

before(() => {
  db = createDatabase(':memory:')
  app = createApp(db, { secureCookies: false })
})

after(() => db.close())

test('farmer dashboard aggregates only owned database records and records batch activity', async () => {
  const farmer = await createFarmer('dashboard.farmer@example.com', 'Field Farmer')
  const otherFarmer = await createFarmer('other.farmer@example.com', 'Other Farmer')

  const empty = await farmer.get('/api/dashboard/overview').expect(200)
  assert.equal(empty.body.user.fullName, 'Field Farmer')
  assert.equal(empty.body.stats.totalBatches, 0)
  assert.equal(empty.body.stats.verifiedBatches, 0)
  assert.equal(empty.body.stats.averageQuality, null)
  assert.equal(empty.body.stats.totalRevenue, 0)
  assert.deepEqual(empty.body.recentBatches, [])
  assert.deepEqual(empty.body.activities, [])
  assert.equal(empty.body.latestAnalysis, null)

  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=', 'base64')
  const upload = await farmer.post('/api/dashboard/uploads').attach('image', image, { filename: 'harvest.png', contentType: 'image/png' }).expect(201)
  assert.match(upload.body.imageUrl, /^\/uploads\//)

  const created = await farmer.post('/api/dashboard/batches').send({
    produceName: 'Roma tomato',
    quantity: 240,
    unit: 'kg',
    harvestDate: '2026-09-20',
    farmLocation: 'Pune, Maharashtra',
    imageUrl: upload.body.imageUrl,
    revenueAmount: 7200,
  }).expect(201)
  const batchId = created.body.batch.id
  assert.match(created.body.batch.batchId, /^AGT-/)
  assert.equal(created.body.batch.status, 'pending')
  assert.equal(created.body.batch.imageUrl, upload.body.imageUrl)
  await farmer.get('/api/dashboard/passports').expect(200).expect(({ body }) => assert.deepEqual(body.passports, []))
  await farmer.post(`/api/dashboard/batches/${batchId}/passport`).expect(409)
  if (!process.env.AI_SERVICE_URL) await farmer.post(`/api/dashboard/batches/${batchId}/analyze`).expect(503)
  await request(app).get('/api/public/passports/not-a-real-passport').expect(404)

  const overview = await farmer.get('/api/dashboard/overview').expect(200)
  assert.equal(overview.body.stats.totalBatches, 1)
  assert.equal(overview.body.stats.verifiedBatches, 0)
  assert.equal(overview.body.stats.totalRevenue, 7200)
  assert.equal(overview.body.recentBatches[0].produceName, 'Roma tomato')
  assert.equal(overview.body.activities[0].type, 'batch_created')
  assert.equal(overview.body.performance.reduce((sum, row) => sum + row.batches, 0), 1)

  await otherFarmer.get(`/api/dashboard/batches?search=${created.body.batch.batchId}`).expect(200).expect(({ body }) => {
    assert.equal(body.total, 0)
  })
  await otherFarmer.put(`/api/dashboard/batches/${batchId}`).send({ status: 'in_transit' }).expect(404)
  await otherFarmer.delete(`/api/dashboard/batches/${batchId}`).expect(404)

  await farmer.put(`/api/dashboard/batches/${batchId}`).send({ status: 'verified' }).expect(400)
  await farmer.put(`/api/dashboard/batches/${batchId}`).send({ status: 'in_transit' }).expect(200)
  const filtered = await farmer.get('/api/dashboard/batches?status=in_transit').expect(200)
  assert.equal(filtered.body.total, 1)
  assert.equal(filtered.body.items[0].status, 'in_transit')
  assert.equal((await farmer.get('/api/dashboard/overview')).body.stats.verifiedBatches, 0)

  await farmer.delete(`/api/dashboard/batches/${batchId}`).expect(204)
  const afterDelete = await farmer.get('/api/dashboard/overview').expect(200)
  assert.equal(afterDelete.body.stats.totalBatches, 0)
  assert.equal(afterDelete.body.activities[0].type, 'batch_deleted')
})

test('dashboard APIs reject missing sessions and non-farmer accounts', async () => {
  await request(app).get('/api/dashboard/overview').expect(401)

  const consumer = request.agent(app)
  await consumer.post('/api/auth/register').send({
    fullName: 'Consumer Test',
    email: 'dashboard.consumer@example.com',
    role: 'consumer',
    password: 'secure-harvest-password-92',
    termsAccepted: true,
  }).expect(201)
  await consumer.get('/api/dashboard/overview').expect(403)
})

test('development seed is scoped to an existing farmer and skips non-empty accounts', () => {
  const seedDb = createDatabase(':memory:')
  const originalNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'development'
  try {
    const farmerId = randomUUID()
    const now = new Date().toISOString()
    seedDb.prepare(`INSERT INTO users (id, full_name, email, role, farm_name, farm_location, password_hash, terms_accepted_at, created_at)
      VALUES (?, ?, ?, 'farmer', ?, ?, ?, ?, ?)`)
      .run(farmerId, 'Seed Farmer', 'seed.farmer@example.com', 'Sample Farm', 'Maharashtra', 'test-hash', now, now)

    const first = seedDevelopmentData(seedDb, 'seed.farmer@example.com')
    const second = seedDevelopmentData(seedDb, 'seed.farmer@example.com')
    const overview = createDashboardService(seedDb).getOverview(farmerId)

    assert.equal(first.created, 4)
    assert.equal(second.created, 0)
    assert.equal(overview.stats.totalBatches, 4)
    assert.equal(overview.stats.averageQuality, null)
    assert.ok(overview.recentBatches.every((batch) => batch.freshnessScore === null && batch.aiGrade === null && batch.blockchainHash === null))
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
    seedDb.close()
  }
})
