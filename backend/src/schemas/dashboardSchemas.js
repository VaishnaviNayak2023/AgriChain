import { z } from 'zod'

const dateString = z.string().date()

export const createBatchSchema = z.object({
  produceName: z.string().trim().min(2).max(100),
  quantity: z.number().positive().max(1_000_000),
  unit: z.string().trim().min(1).max(16).default('kg'),
  harvestDate: dateString,
  farmLocation: z.string().trim().max(180).optional().default(''),
  imageUrl: z.string().startsWith('/uploads/').optional().nullable().default(null),
  revenueAmount: z.number().nonnegative().max(1_000_000_000).optional().default(0),
})

export const updateBatchSchema = createBatchSchema.partial().extend({
  status: z.enum(['pending', 'in_transit', 'processing']).optional(),
})

export const profileSchema = z.object({
  farmName: z.string().trim().max(120).optional(),
  farmLocation: z.string().trim().max(180).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
})

export const analysisResultSchema = z.object({
  freshnessScore: z.number().min(0).max(100),
  grade: z.string().trim().min(1).max(12),
  confidence: z.number().min(0).max(100),
  defects: z.array(z.string().trim().min(1).max(120)).max(50),
})
