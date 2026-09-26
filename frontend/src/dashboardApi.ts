export interface FarmerProfile {
  id: string
  fullName: string
  email: string
  phone: string | null
  role: 'farmer'
  farmName: string
  farmLocation: string
  latitude: number | null
  longitude: number | null
  createdAt: string
}

export interface DashboardStats {
  totalBatches: number
  verifiedBatches: number
  averageQuality: number | null
  totalRevenue: number
  verifiedRate: number | null
}

export interface BatchRecord {
  id: string
  batchId: string
  produceName: string
  quantity: number
  unit: string
  harvestDate: string
  farmLocation: string
  imageUrl: string | null
  freshnessScore: number | null
  aiGrade: string | null
  blockchainHash: string | null
  status: 'pending' | 'verified' | 'in_transit' | 'processing' | 'rejected'
  revenueAmount: number
  createdAt: string
  updatedAt?: string
}

export interface DashboardOverview {
  user: FarmerProfile
  stats: DashboardStats
  recentBatches: BatchRecord[]
  latestAnalysis: {
    id: string
    batchId: string
    produceName: string
    imageUrl: string | null
    freshnessScore: number
    grade: string
    confidence: number
    defects: string[]
    createdAt: string
  } | null
  activities: { id: string; type: string; description: string; metadata: Record<string, unknown>; createdAt: string }[]
  performance: { month: string; batches: number; revenue: number; averageQuality: number | null }[]
  farmLocation: { farmName: string; location: string; latitude: number | null; longitude: number | null; configured: boolean } | null
  integrations: { ai: boolean; blockchain: boolean; imageStorage: boolean }
}

interface BatchList {
  items: BatchRecord[]
  page: number
  pageSize: number
  total: number
  pageCount: number
}

export interface ProducePassport {
  id: string
  publicId: string
  batchId: string
  produceName: string
  quantity: number
  unit: string
  harvestDate: string
  imageUrl: string | null
  freshnessScore: number | null
  aiGrade: string | null
  blockchainHash: string
  createdAt: string
}

export interface PublicPassport {
  publicId: string
  passportCreatedAt: string
  batchId: string
  produceName: string
  quantity: number
  unit: string
  harvestDate: string
  farmLocation: string
  imageUrl: string | null
  freshnessScore: number | null
  aiGrade: string | null
  blockchainHash: string
  batchCreatedAt: string
  farmName: string
  farmerName: string
  activities: { id: string; type: string; description: string; createdAt: string }[]
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: init.body instanceof FormData
      ? init.headers
      : { 'Content-Type': 'application/json', ...init.headers },
  })
  const result = await response.json().catch(() => ({})) as { error?: string } & T
  if (!response.ok) throw new Error(result.error ?? 'Could not load dashboard data.')
  return result
}

const json = (value: unknown) => JSON.stringify(value)

export const dashboardApi = {
  overview: () => apiRequest<DashboardOverview>('/api/dashboard/overview'),
  batches: (params: { search?: string; status?: string; page?: number; pageSize?: number; sort?: string; direction?: string } = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => [key, String(value)]))
    return apiRequest<BatchList>(`/api/dashboard/batches?${query}`)
  },
  createBatch: (input: { produceName: string; quantity: number; unit: string; harvestDate: string; farmLocation: string; revenueAmount: number; imageUrl?: string | null }) =>
    apiRequest<{ batch: BatchRecord }>('/api/dashboard/batches', { method: 'POST', body: json(input) }),
  uploadImage: (image: File) => {
    const form = new FormData()
    form.append('image', image)
    return apiRequest<{ imageUrl: string }>('/api/dashboard/uploads', { method: 'POST', body: form })
  },
  updateBatch: (id: string, input: Partial<BatchRecord>) =>
    apiRequest<{ batch: BatchRecord }>(`/api/dashboard/batches/${encodeURIComponent(id)}`, { method: 'PUT', body: json(input) }),
  analyzeBatch: (id: string) => apiRequest<{ analysis: DashboardOverview['latestAnalysis'] }>(`/api/dashboard/batches/${encodeURIComponent(id)}/analyze`, { method: 'POST', body: '{}' }),
  deleteBatch: (id: string) => apiRequest<void>(`/api/dashboard/batches/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  passports: () => apiRequest<{ passports: ProducePassport[] }>('/api/dashboard/passports'),
  createPassport: (id: string) => apiRequest<{ passport: Pick<ProducePassport, 'id' | 'publicId' | 'createdAt' | 'batchId'> }>(`/api/dashboard/batches/${encodeURIComponent(id)}/passport`, { method: 'POST', body: '{}' }),
  publicPassport: (publicId: string) => apiRequest<{ passport: PublicPassport }>(`/api/public/passports/${encodeURIComponent(publicId)}`),
  activities: () => apiRequest<{ activities: DashboardOverview['activities'] }>('/api/dashboard/activity'),
  qualityDistribution: () => apiRequest<{ distribution: { grade: string; batches: number }[] }>('/api/dashboard/analytics/quality-distribution'),
  revenue: () => apiRequest<{ revenue: { month: string; revenue: number }[] }>('/api/dashboard/analytics/revenue'),
  updateProfile: (input: { farmName: string; farmLocation: string; latitude: number | null; longitude: number | null }) =>
    apiRequest<{ user: FarmerProfile }>('/api/dashboard/profile', { method: 'PUT', body: json(input) }),
}
