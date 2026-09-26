import { randomBytes, randomUUID } from 'node:crypto'

const PUBLIC_USER = `
  SELECT id, full_name AS fullName, email, phone, role,
    farm_name AS farmName, farm_location AS farmLocation,
    latitude, longitude, created_at AS createdAt
  FROM users WHERE id = ?
`

function monthKeys(count) {
  const now = new Date()
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - count + index + 1, 1))
    return date.toISOString().slice(0, 7)
  })
}

function activityRow(row) {
  return { ...row, metadata: JSON.parse(row.metadata_json) }
}

export function createDashboardService(db) {
  const addActivity = db.prepare(`
    INSERT INTO activities (id, farmer_id, type, description, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const addActivityEvent = (farmerId, type, description, metadata = {}) =>
    addActivity.run(randomUUID(), farmerId, type, description, JSON.stringify(metadata), new Date().toISOString())

  const overviewStats = db.prepare(`
    SELECT COUNT(*) AS totalBatches,
      SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) AS verifiedBatches,
      AVG(freshness_score) AS averageQuality,
      COALESCE(SUM(revenue_amount), 0) AS totalRevenue
    FROM batches WHERE farmer_id = ?
  `)

  function getPerformance(farmerId, count = 6) {
    const keys = monthKeys(count)
    const firstKey = keys[0]
    const grouped = db.prepare(`
      SELECT substr(created_at, 1, 7) AS month,
        COUNT(*) AS batches,
        COALESCE(SUM(revenue_amount), 0) AS revenue,
        AVG(freshness_score) AS averageQuality
      FROM batches
      WHERE farmer_id = ? AND created_at >= ?
      GROUP BY substr(created_at, 1, 7)
      ORDER BY month
    `).all(farmerId, `${firstKey}-01T00:00:00.000Z`)
    const byMonth = new Map(grouped.map((row) => [row.month, row]))
    return keys.map((month) => {
      const row = byMonth.get(month)
      return {
        month,
        batches: row?.batches ?? 0,
        revenue: row?.revenue ?? 0,
        averageQuality: row?.averageQuality ?? null,
      }
    })
  }

  return {
    getOverview(farmerId) {
      const user = db.prepare(PUBLIC_USER).get(farmerId)
      const stats = overviewStats.get(farmerId)
      const recentBatches = db.prepare(`
        SELECT id, batch_id AS batchId, produce_name AS produceName, quantity, unit,
          harvest_date AS harvestDate, image_url AS imageUrl, freshness_score AS freshnessScore,
          ai_grade AS aiGrade, blockchain_hash AS blockchainHash,
          revenue_amount AS revenueAmount, status, created_at AS createdAt
        FROM batches WHERE farmer_id = ? ORDER BY created_at DESC LIMIT 6
      `).all(farmerId)
      const latestAnalysis = db.prepare(`
        SELECT ai_analyses.id, batches.batch_id AS batchId, batches.produce_name AS produceName,
          batches.image_url AS imageUrl, ai_analyses.freshness_score AS freshnessScore,
          ai_analyses.grade, ai_analyses.confidence,
          ai_analyses.defects_json AS defectsJson, ai_analyses.created_at AS createdAt
        FROM ai_analyses JOIN batches ON batches.id = ai_analyses.batch_id
        WHERE ai_analyses.farmer_id = ? ORDER BY ai_analyses.created_at DESC LIMIT 1
      `).get(farmerId)
      const activities = db.prepare(`
        SELECT id, type, description, metadata_json, created_at AS createdAt
        FROM activities WHERE farmer_id = ? ORDER BY created_at DESC LIMIT 8
      `).all(farmerId).map(activityRow)
      const performance = getPerformance(farmerId)
      const totalBatches = stats.totalBatches ?? 0
      return {
        user,
        stats: {
          totalBatches,
          verifiedBatches: stats.verifiedBatches ?? 0,
          averageQuality: stats.averageQuality === null ? null : Number(stats.averageQuality),
          totalRevenue: Number(stats.totalRevenue),
          verifiedRate: totalBatches ? Number(stats.verifiedBatches ?? 0) / totalBatches * 100 : null,
        },
        recentBatches,
        latestAnalysis: latestAnalysis ? {
          ...latestAnalysis,
          freshnessScore: Number(latestAnalysis.freshnessScore),
          confidence: Number(latestAnalysis.confidence),
          defects: JSON.parse(latestAnalysis.defectsJson),
        } : null,
        activities,
        performance,
        farmLocation: user ? {
          farmName: user.farmName,
          location: user.farmLocation,
          latitude: user.latitude,
          longitude: user.longitude,
          configured: Boolean(user.farmLocation && user.latitude !== null && user.longitude !== null),
        } : null,
        integrations: {
          ai: Boolean(process.env.AI_SERVICE_URL),
          blockchain: Boolean(process.env.POLYGON_RPC_URL && process.env.BLOCKCHAIN_PRIVATE_KEY && process.env.POLYGON_CONTRACT_ADDRESS),
          imageStorage: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
        },
      }
    },

    listBatches(farmerId, { search = '', status = '', sort = 'created_at', direction = 'desc', page = 1, pageSize = 10 } = {}) {
      const allowedSort = { created_at: 'created_at', harvest_date: 'harvest_date', produce_name: 'produce_name', quantity: 'quantity', status: 'status' }
      const sortColumn = allowedSort[sort] ?? 'created_at'
      const sortDirection = direction === 'asc' ? 'ASC' : 'DESC'
      const filters = ['farmer_id = ?']
      const values = [farmerId]
      if (search.trim()) {
        filters.push('(produce_name LIKE ? OR batch_id LIKE ?)')
        values.push(`%${search.trim()}%`, `%${search.trim()}%`)
      }
      if (status) {
        filters.push('status = ?')
        values.push(status)
      }
      const where = filters.join(' AND ')
      const total = db.prepare(`SELECT COUNT(*) AS total FROM batches WHERE ${where}`).get(...values).total
      const rows = db.prepare(`
        SELECT id, batch_id AS batchId, produce_name AS produceName, quantity, unit,
          harvest_date AS harvestDate, farm_location AS farmLocation, image_url AS imageUrl,
          freshness_score AS freshnessScore, ai_grade AS aiGrade, blockchain_hash AS blockchainHash,
          status, revenue_amount AS revenueAmount, created_at AS createdAt, updated_at AS updatedAt
        FROM batches WHERE ${where} ORDER BY ${sortColumn} ${sortDirection}
        LIMIT ? OFFSET ?
      `).all(...values, pageSize, (page - 1) * pageSize)
      return { items: rows, page, pageSize, total, pageCount: Math.ceil(total / pageSize) }
    },

    createBatch(farmerId, input) {
      const id = randomUUID()
      const batchId = `AGT-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`
      const now = new Date().toISOString()
      db.transaction(() => {
        db.prepare(`
          INSERT INTO batches (
            id, batch_id, farmer_id, produce_name, quantity, unit, harvest_date,
            farm_location, image_url, revenue_amount, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `).run(id, batchId, farmerId, input.produceName, input.quantity, input.unit, input.harvestDate,
          input.farmLocation, input.imageUrl, input.revenueAmount, now, now)
        addActivityEvent(farmerId, 'batch_created', `Batch ${batchId} registered.`, { batchId, produceName: input.produceName })
      })()
      return db.prepare(`SELECT id, batch_id AS batchId, produce_name AS produceName, quantity, unit,
        harvest_date AS harvestDate, farm_location AS farmLocation, image_url AS imageUrl,
        freshness_score AS freshnessScore, ai_grade AS aiGrade, blockchain_hash AS blockchainHash,
        status, revenue_amount AS revenueAmount, created_at AS createdAt, updated_at AS updatedAt
        FROM batches WHERE id = ?`).get(id)
    },

    updateBatch(farmerId, id, input) {
      const current = db.prepare('SELECT * FROM batches WHERE id = ? AND farmer_id = ?').get(id, farmerId)
      if (!current) return null
      const fields = {
        produceName: 'produce_name', quantity: 'quantity', unit: 'unit', harvestDate: 'harvest_date',
        farmLocation: 'farm_location', revenueAmount: 'revenue_amount', status: 'status',
      }
      const changes = Object.entries(input).filter(([key, value]) => fields[key] && value !== undefined)
      if (!changes.length) return this.getBatch(farmerId, id)
      const now = new Date().toISOString()
      db.transaction(() => {
        const assignments = changes.map(([key]) => `${fields[key]} = ?`)
        const values = changes.map(([, value]) => value)
        db.prepare(`UPDATE batches SET ${assignments.join(', ')}, updated_at = ? WHERE id = ? AND farmer_id = ?`)
          .run(...values, now, id, farmerId)
        addActivityEvent(farmerId, 'batch_updated', `Batch ${current.batch_id} updated.`, { batchId: current.batch_id })
      })()
      return this.getBatch(farmerId, id)
    },

    getBatch(farmerId, id) {
      return db.prepare(`SELECT id, batch_id AS batchId, produce_name AS produceName, quantity, unit,
        harvest_date AS harvestDate, farm_location AS farmLocation, image_url AS imageUrl,
        freshness_score AS freshnessScore, ai_grade AS aiGrade, blockchain_hash AS blockchainHash,
        status, revenue_amount AS revenueAmount, created_at AS createdAt, updated_at AS updatedAt
        FROM batches WHERE id = ? AND farmer_id = ?`).get(id, farmerId) ?? null
    },

    saveAnalysis(farmerId, batchId, result) {
      const batch = this.getBatch(farmerId, batchId)
      if (!batch) return null
      const id = randomUUID()
      const now = new Date().toISOString()
      db.transaction(() => {
        db.prepare(`INSERT INTO ai_analyses (id, batch_id, farmer_id, freshness_score, grade, confidence, defects_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(id, batch.id, farmerId, result.freshnessScore, result.grade, result.confidence, JSON.stringify(result.defects), now)
        db.prepare('UPDATE batches SET freshness_score = ?, ai_grade = ?, updated_at = ? WHERE id = ? AND farmer_id = ?')
          .run(result.freshnessScore, result.grade, now, batch.id, farmerId)
        addActivityEvent(farmerId, 'analysis_completed', `AI quality analysis completed for ${batch.batchId}.`, { batchId: batch.batchId, grade: result.grade })
      })()
      return { id, batchId: batch.batchId, produceName: batch.produceName, imageUrl: batch.imageUrl, ...result, createdAt: now }
    },

    createPassport(farmerId, batchId) {
      const batch = this.getBatch(farmerId, batchId)
      if (!batch) return { error: 'not_found' }
      if (batch.status !== 'verified' || !batch.blockchainHash) return { error: 'not_verified' }
      const existing = db.prepare('SELECT id, public_id AS publicId, created_at AS createdAt FROM produce_passports WHERE batch_id = ? AND farmer_id = ?').get(batch.id, farmerId)
      if (existing) return { passport: { ...existing, batchId: batch.batchId } }
      const passport = { id: randomUUID(), publicId: randomBytes(18).toString('base64url'), createdAt: new Date().toISOString(), batchId: batch.batchId }
      db.transaction(() => {
        db.prepare('INSERT INTO produce_passports (id, batch_id, farmer_id, public_id, created_at) VALUES (?, ?, ?, ?, ?)')
          .run(passport.id, batch.id, farmerId, passport.publicId, passport.createdAt)
        addActivityEvent(farmerId, 'passport_generated', `Produce passport generated for ${batch.batchId}.`, { batchId: batch.batchId, publicId: passport.publicId })
      })()
      return { passport }
    },

    listPassports(farmerId) {
      return db.prepare(`SELECT passports.id, passports.public_id AS publicId, passports.created_at AS createdAt,
        batches.batch_id AS batchId, batches.produce_name AS produceName, batches.quantity, batches.unit,
        batches.harvest_date AS harvestDate, batches.image_url AS imageUrl,
        batches.freshness_score AS freshnessScore, batches.ai_grade AS aiGrade,
        batches.blockchain_hash AS blockchainHash
        FROM produce_passports AS passports
        JOIN batches ON batches.id = passports.batch_id
        WHERE passports.farmer_id = ? ORDER BY passports.created_at DESC`).all(farmerId)
    },

    getPublicPassport(publicId) {
      const passport = db.prepare(`SELECT passports.public_id AS publicId, passports.created_at AS passportCreatedAt,
        batches.batch_id AS batchId, batches.produce_name AS produceName, batches.quantity, batches.unit,
        batches.harvest_date AS harvestDate, batches.farm_location AS farmLocation, batches.image_url AS imageUrl,
        batches.freshness_score AS freshnessScore, batches.ai_grade AS aiGrade,
        batches.blockchain_hash AS blockchainHash, batches.created_at AS batchCreatedAt,
        users.farm_name AS farmName, users.full_name AS farmerName
        FROM produce_passports AS passports
        JOIN batches ON batches.id = passports.batch_id
        JOIN users ON users.id = batches.farmer_id
        WHERE passports.public_id = ?`).get(publicId)
      if (!passport) return null
      const activities = db.prepare(`SELECT id, type, description, created_at AS createdAt
        FROM activities WHERE farmer_id = ? AND metadata_json LIKE ? ORDER BY created_at ASC`)
        .all(db.prepare('SELECT farmer_id FROM batches WHERE batch_id = ?').get(passport.batchId).farmer_id, `%"batchId":"${passport.batchId}"%`)
      return { ...passport, activities }
    },

    deleteBatch(farmerId, id) {
      const batch = db.prepare('SELECT id, batch_id AS batchId FROM batches WHERE id = ? AND farmer_id = ?').get(id, farmerId)
      if (!batch) return false
      db.transaction(() => {
        addActivityEvent(farmerId, 'batch_deleted', `Batch ${batch.batchId} deleted.`, { batchId: batch.batchId })
        db.prepare('DELETE FROM batches WHERE id = ? AND farmer_id = ?').run(id, farmerId)
      })()
      return true
    },

    getActivities(farmerId, limit = 30) {
      return db.prepare(`SELECT id, type, description, metadata_json, created_at AS createdAt
        FROM activities WHERE farmer_id = ? ORDER BY created_at DESC LIMIT ?`).all(farmerId, limit).map(activityRow)
    },

    getQualityDistribution(farmerId) {
      return db.prepare(`SELECT ai_grade AS grade, COUNT(*) AS batches
        FROM batches WHERE farmer_id = ? AND ai_grade IS NOT NULL GROUP BY ai_grade ORDER BY ai_grade`).all(farmerId)
    },

    getRevenue(farmerId) {
      return getPerformance(farmerId).map(({ month, revenue }) => ({ month, revenue }))
    },

    updateProfile(farmerId, input) {
      const fields = { farmName: 'farm_name', farmLocation: 'farm_location', latitude: 'latitude', longitude: 'longitude' }
      const changes = Object.entries(input).filter(([key]) => fields[key])
      if (!changes.length) return db.prepare(PUBLIC_USER).get(farmerId)
      const assignments = changes.map(([key]) => `${fields[key]} = ?`)
      const values = changes.map(([, value]) => value)
      db.prepare(`UPDATE users SET ${assignments.join(', ')} WHERE id = ?`).run(...values, farmerId)
      return db.prepare(PUBLIC_USER).get(farmerId)
    },

    addActivity: addActivityEvent,
  }
}
