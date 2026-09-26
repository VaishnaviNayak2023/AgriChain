import { z } from 'zod'

const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase())
const password = z.string().min(8, 'Use at least 8 characters.').max(72, 'Password must be 72 characters or fewer.')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be 72 bytes or fewer.')

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(80),
  email,
  phone: z.string().trim().max(30).optional().transform((value) => value || null),
  role: z.enum(['farmer', 'wholesaler', 'retailer', 'consumer', 'regulator']),
  farmName: z.string().trim().max(120).optional().default(''),
  farmLocation: z.string().trim().max(180).optional().default(''),
  password,
  termsAccepted: z.literal(true, { errorMap: () => ({ message: 'Accept the terms to create an account.' }) }),
})

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(72).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Invalid email or password.'),
  rememberMe: z.boolean().default(false),
})
