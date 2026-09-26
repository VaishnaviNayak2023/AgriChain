import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createDatabase } from '../db/database.js'
import { createDashboardService } from '../services/dashboardService.js'

const developmentBatches = [
  { produceName: 'Roma tomato', quantity: 240, unit: 'kg', daysAgo: 5, revenueAmount: 7200, status: 'pending' },
  { produceName: 'Basmati rice', quantity: 680, unit: 'kg', daysAgo: 12, revenueAmount: 0, status: 'processing' },
  { produceName: 'Green gram', quantity: 315, unit: 'kg', daysAgo: 26, revenueAmount: 9450, status: 'in_transit' },
  { produceName: 'Red onion', quantity: 520, unit: 'kg', daysAgo: 48, revenueAmount: 0, status: 'pending' },
]

export function seedDevelopmentData(db, farmerEmail) {
  if (process.env.NODE_ENV === 'production') throw new Error('Development seed data cannot be created in production.')
  if (!farmerEmail) throw new Error('Pass the email address of an existing farmer account.')

  const farmer = db.prepare('SELECT id, farm_location AS farmLocation FROM users WHERE email = ? COLLATE NOCASE AND role = ?').get(farmerEmail, 'farmer')
  if (!farmer) throw new Error('No farmer account was found for that email.')
  const existingCount = db.prepare('SELECT COUNT(*) AS count FROM batches WHERE farmer_id = ?').get(farmer.id).count
  if (existingCount > 0) return { created: 0, reason: 'farmer_already_has_batches' }

  const dashboard = createDashboardService(db)
  for (const sample of developmentBatches) {
    const harvestDate = new Date(Date.now() - sample.daysAgo * 86_400_000).toISOString().slice(0, 10)
    const batch = dashboard.createBatch(farmer.id, {
      produceName: sample.produceName,
      quantity: sample.quantity,
      unit: sample.unit,
      harvestDate,
      farmLocation: farmer.farmLocation,
      imageUrl: null,
      revenueAmount: sample.revenueAmount,
    })
    db.prepare('UPDATE batches SET status = ?, updated_at = ? WHERE id = ?')
      .run(sample.status, new Date().toISOString(), batch.id)
  }

  return { created: developmentBatches.length, reason: 'seeded_development_data' }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const db = createDatabase()
  try {
    const result = seedDevelopmentData(db, process.argv[2])
    console.log(JSON.stringify(result))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  } finally {
    db.close()
  }
}
