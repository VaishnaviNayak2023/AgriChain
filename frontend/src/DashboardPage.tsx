import { useState, type FormEvent, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bell,
  Boxes,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock3,
  CloudUpload,
    Camera,
    ExternalLink,
  FileBadge,
  Filter,
  FlaskConical,
  Leaf,
  LoaderCircle,
  LogOut,
  MapPin,
  Menu,
  MoreHorizontal,
  PackagePlus,
  Search,
  Settings,
  ShieldCheck,
  Sprout,
  TrendingUp,
  Wheat,
  X,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Theme } from './App'
import { authApi } from './api'
import { dashboardApi, type BatchRecord, type DashboardOverview, type ProducePassport } from './dashboardApi'
import ThemeToggle from './ThemeToggle'
import './dashboard.css'

type DashboardView = 'overview' | 'batches' | 'register' | 'analysis' | 'passports' | 'analytics' | 'settings'

const navigation: { id: DashboardView; label: string; icon: typeof Sprout; group: 'workspace' | 'manage' }[] = [
  { id: 'overview', label: 'Dashboard', icon: BarChart3, group: 'workspace' },
  { id: 'batches', label: 'My batches', icon: Boxes, group: 'workspace' },
  { id: 'register', label: 'Register produce', icon: PackagePlus, group: 'workspace' },
  { id: 'analysis', label: 'AI analysis', icon: FlaskConical, group: 'manage' },
  { id: 'passports', label: 'Produce passports', icon: FileBadge, group: 'manage' },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp, group: 'manage' },
  { id: 'settings', label: 'Farm settings', icon: Settings, group: 'manage' },
]

const gradeColors: Record<string, string> = {
  'A+': '#9cdb69', A: '#63c98b', B: '#f2bd55', C: '#e58b4e', D: '#d76355',
}

function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? 'Ã¢â‚¬â€' : new Intl.NumberFormat().format(value)
}

function formatCurrency(value: number | null | undefined) {
  return value === null || value === undefined
    ? 'Ã¢â‚¬â€'
    : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('')
}

function EmptyState({ icon: Icon, title, copy, action }: { icon: typeof Sprout; title: string; copy: string; action?: React.ReactNode }) {
  return <div className="dash-empty"><span className="dash-empty-icon"><Icon size={20} /></span><strong>{title}</strong><p>{copy}</p>{action}</div>
}

function SectionHeading({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy?: string; action?: React.ReactNode }) {
  return <div className="dash-section-heading"><div><span className="dash-eyebrow">{eyebrow}</span><h2>{title}</h2>{copy && <p>{copy}</p>}</div>{action}</div>
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`dash-skeleton ${className}`} aria-hidden="true" />
}

function StatusPill({ status }: { status: BatchRecord['status'] }) {
  const labels: Record<BatchRecord['status'], string> = {
    pending: 'Pending', verified: 'Verified', in_transit: 'In transit', processing: 'Processing', rejected: 'Rejected',
  }
  return <span className={`batch-status status-${status}`}><i />{labels[status]}</span>
}

function MetricCard({ title, value, suffix, icon: Icon, tone, footnote, data, dataKey }: {
  title: string
  value: string
  suffix?: string
  icon: typeof Sprout
  tone: string
  footnote: string
  data: { month: string; batches: number; revenue: number; averageQuality: number | null }[]
  dataKey?: 'batches' | 'revenue' | 'averageQuality'
}) {
  const chartData = dataKey ? data.map((point) => ({ month: point.month, value: point[dataKey] })) : []
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-card-top"><span className="metric-icon"><Icon size={17} /></span><span className="metric-title">{title}</span><span className="metric-more"><MoreHorizontal size={17} /></span></div>
      <div className="metric-value">{value}{suffix && <small>{suffix}</small>}</div>
      <div className="metric-card-bottom"><span className="metric-trend">{dataKey ? <Activity size={12} /> : <BadgeCheck size={12} />}{dataKey ? 'Six-month record' : 'Account total'}</span><span className="metric-footnote">{footnote}</span></div>
      <div className="metric-sparkline" aria-hidden="true">
        {chartData.length > 0 && chartData.some((point) => point.value !== null && point.value !== 0) && <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><Area type="monotone" dataKey="value" stroke="currentColor" fill="currentColor" fillOpacity={0.08} strokeWidth={1.5} isAnimationActive={false} /></AreaChart></ResponsiveContainer>}
      </div>
    </article>
  )
}

function BatchTable({ batches, onDelete, onStatus, onPassport, busy }: {
  batches: BatchRecord[]
  onDelete: (id: string) => void
  onStatus: (id: string, status: BatchRecord['status']) => void
  onPassport?: (id: string) => void
  busy: boolean
}) {
  if (!batches.length) return <EmptyState icon={Boxes} title="No batches yet" copy="Register a harvest to start building your traceability record." />
  return (
    <div className="batch-table-wrap"><table className="batch-table"><thead><tr><th>Batch</th><th>Produce</th><th>Quantity</th><th>Grade</th><th>Status</th><th>Harvest date</th><th aria-label="Actions" /></tr></thead><tbody>
      {batches.map((batch) => <tr key={batch.id}>
        <td><span className="batch-id">{batch.batchId}</span></td>
        <td><span className="produce-cell">{batch.imageUrl ? <img src={batch.imageUrl} alt="" /> : <span className="produce-placeholder"><Wheat size={15} /></span>}<span><strong>{batch.produceName}</strong><small>{batch.farmLocation || 'Farm location not set'}</small></span></span></td>
        <td>{formatNumber(batch.quantity)} <small>{batch.unit}</small></td>
        <td>{batch.aiGrade ? <span className={`grade-pill grade-${batch.aiGrade.replace('+', 'plus')}`}>{batch.aiGrade}</span> : <span className="data-not-ready">Not graded</span>}</td>
        <td><StatusPill status={batch.status} /></td>
        <td>{formatDate(batch.harvestDate)}</td>
        <td><div className="table-actions"><select aria-label={`Update ${batch.batchId} status`} value={batch.status} disabled={busy} onChange={(event) => onStatus(batch.id, event.target.value as BatchRecord['status'])}><option value="pending">Pending</option><option value="in_transit">In transit</option><option value="processing">Processing</option><option value="verified" disabled>Verified</option><option value="rejected" disabled>Rejected</option></select>{onPassport && batch.status === 'verified' && batch.blockchainHash && <button type="button" className="icon-action" title={`Generate passport for ${batch.batchId}`} aria-label={`Generate passport for ${batch.batchId}`} disabled={busy} onClick={() => onPassport(batch.id)}><FileBadge size={15} /></button>}<button type="button" className="icon-action danger-action" title={`Delete ${batch.batchId}`} aria-label={`Delete ${batch.batchId}`} disabled={busy} onClick={() => onDelete(batch.id)}><X size={15} /></button></div></td>
      </tr>)}
    </tbody></table></div>
  )
}

function BatchForm({ farmLocation, onSubmit, onCancel, pending, error }: {
  farmLocation: string
  onSubmit: (input: { produceName: string; quantity: number; unit: string; harvestDate: string; farmLocation: string; revenueAmount: number; image?: File }) => void
  onCancel: () => void
  pending: boolean
  error: string
}) {
  const [imagePreview, setImagePreview] = useState('')
  const [image, setImage] = useState<File>()

  const handleImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImage(file)
    setImagePreview(file ? URL.createObjectURL(file) : '')
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    onSubmit({
      produceName: String(values.get('produceName')),
      quantity: Number(values.get('quantity')),
      unit: String(values.get('unit')),
      harvestDate: String(values.get('harvestDate')),
      farmLocation: String(values.get('farmLocation')),
      revenueAmount: Number(values.get('revenueAmount') || 0),
      image,
    })
  }

  return (
    <form className="produce-form" onSubmit={submit}>
      <label className="upload-dropzone">{imagePreview ? <img src={imagePreview} alt="Selected produce preview" /> : <span className="upload-placeholder"><CloudUpload size={22} /><strong>Add a harvest image</strong><small>JPG, PNG, WebP or AVIF, up to 5 MB</small></span>}<input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={handleImage} /></label>
      <div className="produce-form-fields"><label>Produce name<input name="produceName" required minLength={2} maxLength={100} placeholder="e.g. Roma tomato" /></label><label>Quantity<input name="quantity" type="number" min="0.01" step="any" required placeholder="Enter harvested quantity" /></label><label>Unit<select name="unit" defaultValue="kg"><option value="kg">Kilograms</option><option value="tonne">Tonnes</option><option value="crate">Crates</option><option value="piece">Pieces</option></select></label><label>Harvest date<input name="harvestDate" type="date" max={new Date().toISOString().slice(0, 10)} required defaultValue={new Date().toISOString().slice(0, 10)} /></label><label>Farm location<input name="farmLocation" maxLength={180} defaultValue={farmLocation} placeholder="Farm location" /></label><label>Sale value <span>(optional)</span><input name="revenueAmount" type="number" min="0" step="any" placeholder="Recorded sale value in INR" /></label></div>
      {error && <p className="dash-form-error" role="alert">{error}</p>}
      <div className="form-integrity-note"><ShieldCheck size={15} /><span>Every registration is linked to your farmer account and written to the activity record.</span></div>
      <div className="produce-form-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button className="primary-button" type="submit" disabled={pending}>{pending ? <><LoaderCircle size={15} className="spin-icon" />Saving batch</> : <>Register batch <ArrowRight size={15} /></>}</button></div>
    </form>
  )
}

function DashboardPage({ theme, onToggleTheme, onSignedOut }: { theme: Theme; onToggleTheme: () => void; onSignedOut: () => void }) {
  const queryClient = useQueryClient()
  const [view, setView] = useState<DashboardView>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [batchPage, setBatchPage] = useState(1)
  const [notice, setNotice] = useState('')
  const [formError, setFormError] = useState('')

  const overviewQuery = useQuery({ queryKey: ['dashboard-overview'], queryFn: dashboardApi.overview })
  const batchesQuery = useQuery({
    queryKey: ['dashboard-batches', search, statusFilter, batchPage],
    queryFn: () => dashboardApi.batches({ search, status: statusFilter, page: batchPage, pageSize: 10 }),
    enabled: view === 'batches',
  })
  const qualityQuery = useQuery({ queryKey: ['dashboard-quality'], queryFn: dashboardApi.qualityDistribution, enabled: view === 'analytics' })
  const revenueQuery = useQuery({ queryKey: ['dashboard-revenue'], queryFn: dashboardApi.revenue, enabled: view === 'analytics' })
  const activitiesQuery = useQuery({ queryKey: ['dashboard-activities'], queryFn: dashboardApi.activities, enabled: view === 'overview' })
  const analysisBatchesQuery = useQuery({ queryKey: ['dashboard-analysis-batches'], queryFn: () => dashboardApi.batches({ page: 1, pageSize: 50 }), enabled: view === 'analysis' })
  const passportsQuery = useQuery({ queryKey: ['dashboard-passports'], queryFn: dashboardApi.passports, enabled: view === 'passports' })
  const passportCandidatesQuery = useQuery({ queryKey: ['dashboard-passport-candidates'], queryFn: () => dashboardApi.batches({ page: 1, pageSize: 50 }), enabled: view === 'passports' })

  const refreshDashboard = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-batches'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-activities'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-quality'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-revenue'] }),
    ])
  }

  const createBatchMutation = useMutation({
    mutationFn: async (input: { produceName: string; quantity: number; unit: string; harvestDate: string; farmLocation: string; revenueAmount: number; image?: File }) => {
      let imageUrl: string | null = null
      if (input.image) imageUrl = (await dashboardApi.uploadImage(input.image)).imageUrl
      return dashboardApi.createBatch({ ...input, imageUrl })
    },
    onSuccess: async ({ batch }) => {
      setNotice(`Batch ${batch.batchId} was registered.`)
      setView('batches')
      setSearch('')
      setStatusFilter('')
      setBatchPage(1)
      await refreshDashboard()
    },
    onError: (error) => setFormError(error instanceof Error ? error.message : 'Could not register the batch.'),
  })

  const deleteBatchMutation = useMutation({
    mutationFn: dashboardApi.deleteBatch,
    onSuccess: async () => { setNotice('Batch deleted.'); await refreshDashboard() },
    onError: (error) => setNotice(error instanceof Error ? error.message : 'Could not delete the batch.'),
  })

  const updateBatchMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BatchRecord['status'] }) => dashboardApi.updateBatch(id, { status }),
    onSuccess: async () => { setNotice('Batch status updated.'); await refreshDashboard() },
    onError: (error) => setNotice(error instanceof Error ? error.message : 'Could not update the batch.'),
  })

  const profileMutation = useMutation({
    mutationFn: dashboardApi.updateProfile,
    onSuccess: async () => { setNotice('Farm profile saved.'); await refreshDashboard() },
    onError: (error) => setNotice(error instanceof Error ? error.message : 'Could not save farm profile.'),
  })

  const analysisMutation = useMutation({
    mutationFn: dashboardApi.analyzeBatch,
    onSuccess: async () => { setNotice('AI analysis completed and saved to the batch record.'); await refreshDashboard(); await queryClient.invalidateQueries({ queryKey: ['dashboard-analysis-batches'] }) },
    onError: (error) => setNotice(error instanceof Error ? error.message : 'Could not complete AI analysis.'),
  })

  const passportMutation = useMutation({
    mutationFn: dashboardApi.createPassport,
    onSuccess: async () => {
      setNotice('Produce passport created.')
      await queryClient.invalidateQueries({ queryKey: ['dashboard-passports'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-activities'] })
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : 'Could not create a passport.'),
  })

  const signOut = async () => {
    await authApi.logout()
    onSignedOut()
  }

  if (overviewQuery.isLoading) return <main className="dashboard-loading"><div className="dash-loading-brand"><Sprout size={18} /> AgriChain Trust</div><SkeletonBlock className="dashboard-loading-title" /><div className="dashboard-loading-grid">{Array.from({ length: 4 }, (_, index) => <SkeletonBlock key={index} />)}</div><SkeletonBlock className="dashboard-loading-content" /></main>

  if (overviewQuery.isError || !overviewQuery.data) {
    const errorText = overviewQuery.error instanceof Error ? overviewQuery.error.message : 'Unable to load your farmer dashboard.'
    return <main className="dashboard-error-page"><span><CircleAlert size={21} /></span><h1>Dashboard unavailable</h1><p>{errorText}</p><a className="primary-button" href="/login">Return to sign in <ArrowRight size={15} /></a></main>
  }

  const overview: DashboardOverview = overviewQuery.data
  const batchRows = batchesQuery.data?.items ?? overview.recentBatches
  const activeNavigation = (group: 'workspace' | 'manage') => navigation.filter((item) => item.group === group)
  const onRegister = (input: Parameters<typeof createBatchMutation.mutate>[0]) => {
    setFormError('')
    createBatchMutation.mutate(input)
  }
  const currency = (value: number | null | undefined) => formatCurrency(value)
  const viewTitle: Record<DashboardView, string> = {
    overview: 'Farm overview', batches: 'My batches', register: 'Register produce', analysis: 'AI quality analysis', passports: 'Produce passports', analytics: 'Farm analytics', settings: 'Farm settings',
  }

  return (
    <main className="dashboard-app">
      <button className={`sidebar-scrim ${sidebarOpen ? 'is-visible' : ''}`} aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <a className="dashboard-brand" href="/dashboard"><span className="dashboard-brand-icon"><Sprout size={19} /></span><span><strong>AgriChain Trust</strong><small>FARM OPERATIONS</small></span></a>
        <div className="sidebar-trust"><ShieldCheck size={13} /> TRUST EVERY HARVEST</div>
        <div className="sidebar-group-label">WORKSPACE</div>
        <nav className="dashboard-nav" aria-label="Farmer dashboard">
          {activeNavigation('workspace').map(({ id, label, icon: Icon }) => <button type="button" className={view === id ? 'is-active' : ''} key={id} onClick={() => { setView(id); setSidebarOpen(false); setNotice('') }}><Icon size={17} /><span>{label}</span>{id === 'batches' && overview.stats.totalBatches > 0 && <small>{overview.stats.totalBatches}</small>}</button>)}
        </nav>
        <div className="sidebar-group-label manage-label">OPERATIONS</div>
        <nav className="dashboard-nav" aria-label="Farm operations">
          {activeNavigation('manage').map(({ id, label, icon: Icon }) => <button type="button" className={view === id ? 'is-active' : ''} key={id} onClick={() => { setView(id); setSidebarOpen(false); setNotice('') }}><Icon size={17} /><span>{label}</span>{id === 'analysis' && !overview.integrations.ai && <i className="nav-configuration-dot" title="AI service not configured" />}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="farmer-mini-profile"><span className="farmer-avatar">{initials(overview.user.fullName)}</span><span className="farmer-mini-copy"><strong>{overview.user.fullName}</strong><small>{overview.user.farmName || 'Farmer account'}</small></span><button type="button" title="Sign out" aria-label="Sign out" onClick={signOut}><LogOut size={15} /></button></div><div className="sidebar-data-note"><Sprout size={16} /><span>Your harvest data stays yours.</span></div></div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar"><button className="dashboard-mobile-menu" type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={19} /></button><div className="dashboard-breadcrumb"><span>FARM OPERATIONS</span><ChevronRight size={13} /><strong>{viewTitle[view]}</strong></div><div className="dashboard-top-actions"><span className="api-status"><i /> API connected</span><button className="dashboard-icon-button notification-button" type="button" title="Recent activity" aria-label={`${overview.activities.length} recent activities`} onClick={() => setView('overview')}><Bell size={17} />{overview.activities.length > 0 && <i />}</button><ThemeToggle theme={theme} onToggle={onToggleTheme} /><span className="dashboard-language"><Wheat size={14} /> EN</span><details className="profile-menu"><summary className="profile-menu-trigger"><span className="farmer-avatar">{initials(overview.user.fullName)}</span><ChevronDown size={13} /></summary><div className="profile-menu-panel"><strong>{overview.user.fullName}</strong><small>{overview.user.email}</small><button type="button" onClick={() => setView('settings')}><Settings size={14} /> Farm settings</button><button type="button" onClick={signOut}><LogOut size={14} /> Sign out</button></div></details></div></header>

        <div className="dashboard-content">
          {notice && <div className="dashboard-notice" role="status"><Check size={15} />{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X size={14} /></button></div>}

          {view === 'overview' && <>
            <section className="dashboard-greeting" style={overview.recentBatches.find((batch) => batch.imageUrl)?.imageUrl ? { backgroundImage: `linear-gradient(90deg, rgba(5, 18, 10, .92), rgba(6, 21, 11, .76) 48%, rgba(6, 20, 11, .35)), url("${overview.recentBatches.find((batch) => batch.imageUrl)?.imageUrl}")` } : undefined}><div><span className="dash-eyebrow">{formatDate(new Date().toISOString())} / FARMER WORKSPACE</span><h1>{greeting()}, {overview.user.fullName.split(' ')[0]}</h1><p>Your farm performance, from records in your account.</p></div><button className="primary-button" type="button" onClick={() => { setView('register'); setNotice('') }}><PackagePlus size={16} /> Register new batch <ArrowRight size={15} /></button></section>
            <section className="metrics-grid" aria-label="Farm performance metrics">
              <MetricCard title="Total batches" value={formatNumber(overview.stats.totalBatches)} icon={Boxes} tone="green" footnote="All registered produce" data={overview.performance} dataKey="batches" />
              <MetricCard title="Verified batches" value={formatNumber(overview.stats.verifiedBatches)} icon={ShieldCheck} tone="mint" footnote={overview.stats.verifiedRate === null ? 'Rate unavailable until batches exist' : `${overview.stats.verifiedRate.toFixed(0)}% of your batches`} data={overview.performance} />
              <MetricCard title="Average quality" value={overview.stats.averageQuality === null ? 'Not scored' : overview.stats.averageQuality.toFixed(1)} suffix={overview.stats.averageQuality === null ? '' : '/100'} icon={Leaf} tone="gold" footnote={overview.stats.averageQuality === null ? 'No AI scores recorded' : 'Across scored batches'} data={overview.performance} dataKey="averageQuality" />
              <MetricCard title="Recorded revenue" value={currency(overview.stats.totalRevenue)} icon={TrendingUp} tone="blue" footnote="From batch sale values" data={overview.performance} dataKey="revenue" />
            </section>

            <div className="dashboard-grid dashboard-grid-main">
              <section className="dash-panel recent-batches-panel"><SectionHeading eyebrow="TRACEABILITY RECORDS" title="Recent batches" action={<button className="subtle-link" type="button" onClick={() => setView('batches')}>View all <ArrowRight size={14} /></button>} />{overview.recentBatches.length ? <BatchTable batches={overview.recentBatches} onDelete={(id) => { if (window.confirm('Delete this batch and its linked records?')) deleteBatchMutation.mutate(id) }} onStatus={(id, status) => updateBatchMutation.mutate({ id, status })} busy={deleteBatchMutation.isPending || updateBatchMutation.isPending} /> : <EmptyState icon={Boxes} title="Your first harvest starts here" copy="Register a produce batch to create a traceable record for your farm." action={<button className="subtle-link" type="button" onClick={() => setView('register')}>Register produce <ArrowRight size={14} /></button>} />}</section>
              <section className="dash-panel ai-panel"><SectionHeading eyebrow="IMAGE-BASED QUALITY" title="AI analysis" action={<button className="panel-icon-link" type="button" title="Open AI analysis" aria-label="Open AI analysis" onClick={() => setView('analysis')}><ArrowUpRight size={16} /></button>} />{overview.latestAnalysis ? <div className="latest-analysis"><div className="analysis-produce-image">{overview.latestAnalysis.imageUrl ? <img src={overview.latestAnalysis.imageUrl} alt={overview.latestAnalysis.produceName} /> : <Leaf size={26} />}</div><div className="freshness-meter" style={{ '--score': `${overview.latestAnalysis.freshnessScore}%` } as React.CSSProperties}><strong>{overview.latestAnalysis.freshnessScore}</strong><small>FRESHNESS</small></div><div className="analysis-detail"><span>{overview.latestAnalysis.produceName} / {overview.latestAnalysis.batchId}</span><strong>Grade {overview.latestAnalysis.grade}</strong><small>Confidence {overview.latestAnalysis.confidence}%</small><small>{overview.latestAnalysis.defects.length ? overview.latestAnalysis.defects.join(', ') : 'No defects reported'}</small></div></div> : <EmptyState icon={FlaskConical} title="No completed assessments" copy={overview.integrations.ai ? 'Run an assessment on a batch with an uploaded image.' : 'AI analysis is not connected. Configure AI_SERVICE_URL to enable real image assessments.'} />}{!overview.integrations.ai && <div className="integration-footnote"><CircleAlert size={14} /> AI service not configured</div>}</section>
            </div>

            <section className="dash-panel quick-actions-panel"><SectionHeading eyebrow="FARM OPERATIONS" title="Quick actions" /><div className="quick-actions-grid"><button type="button" onClick={() => setView('register')}><span><PackagePlus size={16} /></span><strong>Register a batch</strong><ArrowRight size={14} /></button><button type="button" onClick={() => setView('register')}><span><Camera size={16} /></span><strong>Upload produce image</strong><ArrowRight size={14} /></button><button type="button" onClick={() => setView('analysis')}><span><FlaskConical size={16} /></span><strong>Run AI analysis</strong><ArrowRight size={14} /></button><button type="button" onClick={() => setView('passports')}><span><FileBadge size={16} /></span><strong>Generate QR passport</strong><ArrowRight size={14} /></button><button type="button" onClick={() => setView('passports')}><span><ShieldCheck size={16} /></span><strong>Blockchain records</strong><ArrowRight size={14} /></button></div></section>

            <div className="dashboard-grid dashboard-grid-lower">
              <section className="dash-panel farm-location-panel"><SectionHeading eyebrow="ORIGIN DETAILS" title="Farm location" action={<button className="panel-icon-link" type="button" title="Edit farm settings" aria-label="Edit farm settings" onClick={() => setView('settings')}><ArrowUpRight size={15} /></button>} />{overview.farmLocation?.configured ? <><div className="location-meta"><span className="farm-name-line"><Sprout size={15} />{overview.farmLocation.farmName || overview.user.fullName}</span><span><MapPin size={14} />{overview.farmLocation.location}</span><small>{overview.farmLocation.latitude?.toFixed(5)}, {overview.farmLocation.longitude?.toFixed(5)}</small></div><iframe title="OpenStreetMap farm location" className="farm-map" src={`https://www.openstreetmap.org/export/embed.html?marker=${overview.farmLocation.latitude}%2C${overview.farmLocation.longitude}&zoom=11`} loading="lazy" referrerPolicy="no-referrer" /></> : <EmptyState icon={MapPin} title="Farm coordinates not set" copy="Add your farm name, location, and coordinates in settings to display its map." action={<button className="subtle-link" type="button" onClick={() => setView('settings')}>Set farm location <ArrowRight size={14} /></button>} />}</section>
              <section className="dash-panel performance-panel"><SectionHeading eyebrow="FROM YOUR BATCH RECORDS" title="Batch performance" action={<button className="panel-icon-link" type="button" title="Open analytics" aria-label="Open analytics" onClick={() => setView('analytics')}><ArrowUpRight size={15} /></button>} /><PerformanceChart data={overview.performance} /></section>
              <section className="dash-panel activity-panel"><SectionHeading eyebrow="ACCOUNT HISTORY" title="Recent activity" action={<button className="subtle-link" type="button" onClick={() => setView('analytics')}>Activity <ArrowRight size={14} /></button>} />{activitiesQuery.isLoading ? <SkeletonBlock className="activity-skeleton" /> : activitiesQuery.data?.activities.length ? <ActivityList activities={activitiesQuery.data.activities.slice(0, 5)} /> : <EmptyState icon={Activity} title="No activity recorded" copy="Batch registrations and updates will appear here." />}</section>
            </div>
          </>}

          {view === 'batches' && <><SectionHeading eyebrow="YOUR TRACEABILITY RECORDS" title="My batches" copy="Search, filter, and update produce batches registered to your farm." action={<button className="primary-button" type="button" onClick={() => setView('register')}><PackagePlus size={15} /> Register batch</button>} /><div className="batch-toolbar"><label className="batch-search"><Search size={15} /><input value={search} onChange={(event) => { setSearch(event.target.value); setBatchPage(1) }} placeholder="Search batch ID or produce" /></label><label className="filter-select"><Filter size={14} /><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setBatchPage(1) }}><option value="">All statuses</option><option value="pending">Pending</option><option value="verified">Verified</option><option value="in_transit">In transit</option><option value="processing">Processing</option><option value="rejected">Rejected</option></select><ChevronDown size={13} /></label><button type="button" className="dashboard-icon-button" title="Refresh batches" aria-label="Refresh batches" onClick={() => batchesQuery.refetch()}><Activity size={15} /></button></div><section className="dash-panel full-batches-panel">{batchesQuery.isLoading ? <SkeletonBlock className="batch-skeleton" /> : batchesQuery.isError ? <InlineError message={batchesQuery.error.message} onRetry={() => batchesQuery.refetch()} /> : <BatchTable batches={batchRows} onDelete={(id) => { if (window.confirm('Delete this batch and its linked records?')) deleteBatchMutation.mutate(id) }} onStatus={(id, status) => updateBatchMutation.mutate({ id, status })} busy={deleteBatchMutation.isPending || updateBatchMutation.isPending} />}<div className="pagination-row"><span>{batchesQuery.data ? `${batchesQuery.data.total} batches` : ''}</span><div><button type="button" aria-label="Previous page" disabled={!batchesQuery.data || batchesQuery.data.page <= 1} onClick={() => setBatchPage((page) => Math.max(1, page - 1))}><ChevronLeft size={16} /></button><span>{batchesQuery.data ? `${batchesQuery.data.page} / ${Math.max(1, batchesQuery.data.pageCount)}` : 'Ã¢â‚¬â€'}</span><button type="button" aria-label="Next page" disabled={!batchesQuery.data || batchesQuery.data.page >= batchesQuery.data.pageCount} onClick={() => setBatchPage((page) => page + 1)}><ChevronRight size={16} /></button></div></div></section></>}

          {view === 'register' && <><SectionHeading eyebrow="NEW TRACEABILITY RECORD" title="Register produce" copy="Record a harvest batch. Its values will appear in your dashboard as soon as it is saved." /><section className="dash-panel register-panel"><BatchForm farmLocation={overview.user.farmLocation} onSubmit={onRegister} onCancel={() => setView('overview')} pending={createBatchMutation.isPending} error={formError} /></section></>}

          {view === 'analysis' && <><SectionHeading eyebrow="QUALITY INTELLIGENCE" title="AI analysis" copy="Assessments run against uploaded batch images and are saved with the batch record." /><div className="analysis-workspace"><section className="dash-panel">{overview.latestAnalysis ? <AnalysisDetail analysis={overview.latestAnalysis} /> : <EmptyState icon={FlaskConical} title="No completed assessments" copy="Analysis results appear here after the configured service returns a validated assessment." />}</section><section className="dash-panel analysis-queue"><SectionHeading eyebrow="IMAGE-READY BATCHES" title="Run assessment" />{!overview.integrations.ai ? <IntegrationStatus label="AI analysis service" configured={false} detail="Set AI_SERVICE_URL on the backend and restart it. No score is generated until a real analysis service responds." /> : analysisBatchesQuery.isLoading ? <SkeletonBlock className="batch-skeleton" /> : analysisBatchesQuery.data?.items.filter((batch) => batch.imageUrl).length ? analysisBatchesQuery.data.items.filter((batch) => batch.imageUrl).map((batch) => <div className="analysis-queue-row" key={batch.id}><span className="queue-image"><img src={batch.imageUrl!} alt="" /></span><span><strong>{batch.produceName}</strong><small>{batch.batchId}</small></span><button type="button" disabled={analysisMutation.isPending} aria-label={`Analyze ${batch.batchId}`} onClick={() => analysisMutation.mutate(batch.id)}>{analysisMutation.isPending ? <LoaderCircle size={15} className="spin-icon" /> : <FlaskConical size={15} />}</button></div>) : <EmptyState icon={Camera} title="No batch images" copy="Register a batch and upload its produce image to make it eligible for analysis." action={<button type="button" className="subtle-link" onClick={() => setView('register')}>Register produce <ArrowRight size={14} /></button>} />}</section></div></>}

          {view === 'passports' && <><SectionHeading eyebrow="PUBLIC TRACEABILITY" title="Produce passports" copy="Generate public QR passports only after a batch has a persisted blockchain verification." /><div className="passport-layout"><section className="dash-panel"><SectionHeading eyebrow="ISSUED PASSPORTS" title="Your passports" />{passportsQuery.isLoading ? <SkeletonBlock className="passport-skeleton" /> : passportsQuery.isError ? <InlineError message={passportsQuery.error.message} onRetry={() => passportsQuery.refetch()} /> : passportsQuery.data?.passports.length ? <div className="passport-grid">{passportsQuery.data.passports.map((passport) => <PassportCard key={passport.id} passport={passport} />)}</div> : <EmptyState icon={FileBadge} title="No passports available" copy="Passports are created from verified batch records. No verified passports are currently associated with your farm." />}</section><section className="dash-panel"><SectionHeading eyebrow="READY TO SHARE" title="Verified batches" />{passportCandidatesQuery.isLoading ? <SkeletonBlock className="batch-skeleton" /> : passportCandidatesQuery.isError ? <InlineError message={passportCandidatesQuery.error.message} onRetry={() => passportCandidatesQuery.refetch()} /> : passportCandidatesQuery.data?.items.filter((batch) => batch.status === 'verified' && batch.blockchainHash).length ? passportCandidatesQuery.data.items.filter((batch) => batch.status === 'verified' && batch.blockchainHash).map((batch) => <div className="passport-candidate" key={batch.id}><span><strong>{batch.produceName}</strong><small>{batch.batchId}</small></span><button type="button" className="secondary-button" disabled={passportMutation.isPending} onClick={() => passportMutation.mutate(batch.id)}><FileBadge size={14} /> Generate QR</button></div>) : <EmptyState icon={ShieldCheck} title="No verified batches" copy="A passport requires a blockchain transaction and a verified batch status. These cannot be set manually." />}{!overview.integrations.blockchain && <IntegrationStatus label="Polygon integration" configured={false} detail="Blockchain submission is unavailable until the Polygon RPC, signer, and contract are configured on the backend." />}</section></div></>}

          {view === 'analytics' && <><SectionHeading eyebrow="DATABASE AGGREGATES" title="Farm analytics" copy="Charts are calculated from your batch and sale records. Missing measurements are left blank rather than estimated." /><div className="analytics-grid"><section className="dash-panel analytics-chart-panel"><SectionHeading eyebrow="MONTHLY ACTIVITY" title="Harvest and revenue" /><PerformanceChart data={overview.performance} showRevenue /></section><section className="dash-panel analytics-chart-panel"><SectionHeading eyebrow="RECORDED AI RESULTS" title="Quality distribution" />{qualityQuery.isLoading ? <SkeletonBlock className="analytics-skeleton" /> : qualityQuery.data?.distribution.length ? <QualityChart data={qualityQuery.data.distribution} /> : <EmptyState icon={Leaf} title="No graded batches" copy="Quality distribution will appear after real AI grades have been saved to your batch records." />}</section><section className="dash-panel analytics-chart-panel revenue-chart-panel"><SectionHeading eyebrow="RECORDED SALES" title="Revenue trend" />{revenueQuery.isLoading ? <SkeletonBlock className="analytics-skeleton" /> : revenueQuery.data?.revenue.some((point) => point.revenue > 0) ? <RevenueChart data={revenueQuery.data.revenue} /> : <EmptyState icon={TrendingUp} title="No sale values recorded" copy="Add actual sale values to batches to see revenue trends." />}</section></div></>}

          {view === 'settings' && <><SectionHeading eyebrow="FARM PROFILE" title="Farm settings" copy="Maintain the farm identity and location attached to your produce records." /><ProfileForm user={overview.user} onSave={(input) => profileMutation.mutate(input)} pending={profileMutation.isPending} notice={notice} /></>}

          <footer className="dashboard-footer"><span>AGRCHAIN TRUST / FARM OPERATIONS</span><span>Dashboard data is scoped to your authenticated account.</span></footer>
        </div>
      </section>
    </main>
  )
}

function PerformanceChart({ data, showRevenue = false }: { data: DashboardOverview['performance']; showRevenue?: boolean }) {
  if (!data.some((point) => point.batches > 0 || point.revenue > 0)) return <EmptyState icon={BarChart3} title="Not enough records yet" copy="Performance charts populate from real batch registrations and recorded sales." />
  return <div className="chart-container"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{ top: 6, right: 10, left: -17, bottom: 0 }}><CartesianGrid stroke="var(--dash-grid)" vertical={false} /><XAxis dataKey="month" tickFormatter={(month) => new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(`${month}-01T00:00:00`))} tick={{ fill: 'var(--dash-muted)', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis yAxisId="batches" allowDecimals={false} tick={{ fill: 'var(--dash-muted)', fontSize: 9 }} axisLine={false} tickLine={false} /><YAxis yAxisId="revenue" orientation="right" hide={!showRevenue} tick={{ fill: 'var(--dash-muted)', fontSize: 9 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ border: '1px solid var(--dash-border)', background: 'var(--dash-tooltip)', color: 'var(--dash-text)', borderRadius: 8, fontSize: 11 }} labelStyle={{ color: 'var(--dash-muted)' }} formatter={(value, name) => [name === 'revenue' ? formatCurrency(Number(value)) : value, name === 'batches' ? 'Batches' : name === 'revenue' ? 'Revenue' : String(name)]} /><Bar yAxisId="batches" dataKey="batches" name="batches" fill="var(--dash-green)" radius={[4, 4, 0, 0]} maxBarSize={25} isAnimationActive={false} />{showRevenue && <Line yAxisId="revenue" type="monotone" dataKey="revenue" name="revenue" stroke="var(--dash-blue)" strokeWidth={2} dot={false} isAnimationActive={false} />}</ComposedChart></ResponsiveContainer></div>
}

function RevenueChart({ data }: { data: { month: string; revenue: number }[] }) {
  return <div className="chart-container"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}><defs><linearGradient id="revenue-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--dash-green)" stopOpacity={.28} /><stop offset="100%" stopColor="var(--dash-green)" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="var(--dash-grid)" vertical={false} /><XAxis dataKey="month" tickFormatter={(month) => new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(`${month}-01T00:00:00`))} tick={{ fill: 'var(--dash-muted)', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => new Intl.NumberFormat(undefined, { notation: 'compact' }).format(value)} tick={{ fill: 'var(--dash-muted)', fontSize: 9 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ border: '1px solid var(--dash-border)', background: 'var(--dash-tooltip)', color: 'var(--dash-text)', borderRadius: 8, fontSize: 11 }} formatter={(value) => [formatCurrency(Number(value)), 'Recorded revenue']} /><Area type="monotone" dataKey="revenue" stroke="var(--dash-green)" fill="url(#revenue-area)" strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div>
}

function QualityChart({ data }: { data: { grade: string; batches: number }[] }) {
  return <div className="quality-chart-wrap"><div className="quality-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="batches" nameKey="grade" innerRadius="60%" outerRadius="84%" paddingAngle={3} stroke="none" isAnimationActive={false}>{data.map((row) => <Cell key={row.grade} fill={gradeColors[row.grade] ?? 'var(--dash-muted)'} />)}</Pie><Tooltip contentStyle={{ border: '1px solid var(--dash-border)', background: 'var(--dash-tooltip)', color: 'var(--dash-text)', borderRadius: 8, fontSize: 11 }} /></PieChart></ResponsiveContainer></div><ul>{data.map((row) => <li key={row.grade}><i style={{ background: gradeColors[row.grade] ?? 'var(--dash-muted)' }} /><span>Grade {row.grade}</span><strong>{formatNumber(row.batches)}</strong></li>)}</ul></div>
}

function ActivityList({ activities }: { activities: Pick<DashboardOverview['activities'][number], 'id' | 'type' | 'description' | 'createdAt'>[] }) {
  const activityIcon: Record<string, typeof Boxes> = { batch_created: PackagePlus, batch_updated: Activity, batch_deleted: X, analysis_completed: FlaskConical, blockchain_verified: ShieldCheck, passport_generated: FileBadge }
  return <ol className="activity-list">{activities.map((activity) => { const Icon = activityIcon[activity.type] ?? Clock3; return <li key={activity.id}><span className={`activity-icon activity-${activity.type}`}><Icon size={14} /></span><span className="activity-copy"><strong>{activity.description}</strong><small>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(activity.createdAt))}</small></span></li> })}</ol>
}

function AnalysisDetail({ analysis }: { analysis: NonNullable<DashboardOverview['latestAnalysis']> }) {
  return <div className="analysis-full"><div className="analysis-full-image">{analysis.imageUrl ? <img src={analysis.imageUrl} alt={analysis.produceName} /> : <Leaf size={24} />}</div><div><span className="dash-eyebrow">{analysis.batchId} / {analysis.produceName}</span><h3>{analysis.freshnessScore} / 100</h3><p>Grade {analysis.grade}, {analysis.confidence}% confidence</p><p>{analysis.defects.length ? analysis.defects.join(', ') : 'No defects returned by the analysis service.'}</p><small>{formatDate(analysis.createdAt)}</small></div></div>
}

function IntegrationStatus({ label, configured, detail }: { label: string; configured: boolean; detail: string }) {
  return <div className={`integration-status ${configured ? 'configured' : ''}`}><span>{configured ? <CircleCheck size={16} /> : <CircleAlert size={16} />}</span><div><strong>{label} / {configured ? 'Configuration detected' : 'Not configured'}</strong><p>{detail}</p></div></div>
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="inline-error"><CircleAlert size={18} /><span>{message}</span><button type="button" onClick={onRetry}>Try again</button></div>
}

function ProfileForm({ user, onSave, pending, notice }: {
  user: DashboardOverview['user']
  onSave: (input: { farmName: string; farmLocation: string; latitude: number | null; longitude: number | null }) => void
  pending: boolean
  notice: string
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    onSave({
      farmName: String(values.get('farmName')),
      farmLocation: String(values.get('farmLocation')),
      latitude: String(values.get('latitude')).trim() ? Number(values.get('latitude')) : null,
      longitude: String(values.get('longitude')).trim() ? Number(values.get('longitude')) : null,
    })
  }
  return <form className="dash-panel profile-form" onSubmit={submit}><div className="profile-form-heading"><span className="profile-avatar-large">{initials(user.fullName)}</span><span><strong>{user.fullName}</strong><small>{user.email}</small></span></div><div className="profile-fields"><label>Farm name<input name="farmName" maxLength={120} defaultValue={user.farmName} placeholder="Farm name" /></label><label>Farm location<input name="farmLocation" maxLength={180} defaultValue={user.farmLocation} placeholder="District, state" /></label><label>Latitude<input name="latitude" type="number" min="-90" max="90" step="any" defaultValue={user.latitude ?? ''} placeholder="Map latitude" /></label><label>Longitude<input name="longitude" type="number" min="-180" max="180" step="any" defaultValue={user.longitude ?? ''} placeholder="Map longitude" /></label></div><p className="profile-data-note"><MapPin size={14} /> Coordinates power the farm map. Leave blank if you do not want to share precise location.</p>{notice && <p className="profile-save-notice" role="status"><Check size={14} />{notice}</p>}<button className="primary-button" type="submit" disabled={pending}>{pending ? <LoaderCircle size={15} className="spin-icon" /> : <Check size={15} />}{pending ? 'Saving profile' : 'Save farm profile'}</button></form>
}

function PassportCard({ passport }: { passport: ProducePassport }) {
  const url = `${window.location.origin}/public/passport/${encodeURIComponent(passport.publicId)}`
  return <article className="passport-card"><div className="passport-qr"><QRCodeSVG value={url} size={108} level="M" bgColor="#ffffff" fgColor="#10291a" /></div><div className="passport-card-details"><span className="batch-status status-verified"><i /> Verified record</span><h3>{passport.produceName}</h3><p>{passport.batchId} / {formatNumber(passport.quantity)} {passport.unit}</p><span>Harvested {formatDate(passport.harvestDate)}</span><span>{passport.aiGrade ? `Grade ${passport.aiGrade}` : 'No AI grade recorded'}</span><a className="subtle-link" href={`/public/passport/${encodeURIComponent(passport.publicId)}`} target="_blank" rel="noreferrer">Open public passport <ExternalLink size={13} /></a></div></article>
}

export function PublicPassportPage({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const publicId = window.location.pathname.split('/').filter(Boolean).at(-1) ?? ''
  const passportQuery = useQuery({ queryKey: ['public-passport', publicId], queryFn: () => dashboardApi.publicPassport(publicId), enabled: Boolean(publicId) })
  const passport = passportQuery.data?.passport

  return <main className="public-passport-page"><header className="public-passport-header"><a className="dashboard-brand" href="/"><span className="dashboard-brand-icon"><Sprout size={19} /></span><span><strong>AgriChain Trust</strong><small>PUBLIC PRODUCE PASSPORT</small></span></a><ThemeToggle theme={theme} onToggle={onToggleTheme} /></header>{passportQuery.isLoading ? <div className="public-passport-content"><SkeletonBlock className="public-passport-skeleton" /></div> : passportQuery.isError || !passport ? <div className="public-passport-content"><EmptyState icon={FileBadge} title="Passport not found" copy={passportQuery.error instanceof Error ? passportQuery.error.message : 'This public passport is unavailable.'} /></div> : <article className="public-passport-content"><div className="public-passport-title"><span className="dash-eyebrow">PUBLIC TRACEABILITY RECORD</span><h1>{passport.produceName}</h1><p>{passport.batchId}</p><span className="batch-status status-verified"><i /> Blockchain verified</span></div><section className="public-passport-summary"><div className="public-passport-image">{passport.imageUrl ? <img src={passport.imageUrl} alt={passport.produceName} /> : <Wheat size={27} />}</div><dl><div><dt>Origin</dt><dd>{passport.farmName || passport.farmerName}{passport.farmLocation ? `, ${passport.farmLocation}` : ''}</dd></div><div><dt>Produce</dt><dd>{passport.produceName}</dd></div><div><dt>Quantity</dt><dd>{formatNumber(passport.quantity)} {passport.unit}</dd></div><div><dt>Harvest date</dt><dd>{formatDate(passport.harvestDate)}</dd></div><div><dt>AI grade</dt><dd>{passport.aiGrade ?? 'No grade recorded'}</dd></div><div><dt>Freshness score</dt><dd>{passport.freshnessScore === null ? 'Not assessed' : `${passport.freshnessScore} / 100`}</dd></div><div className="passport-hash"><dt>Blockchain transaction</dt><dd>{passport.blockchainHash}</dd></div></dl></section><section className="public-passport-timeline"><SectionHeading eyebrow="RECORDED EVENTS" title="Traceability timeline" />{passport.activities.length ? <ActivityList activities={passport.activities} /> : <p className="passport-timeline-empty">No additional timeline events are available.</p>}</section><footer className="public-passport-footer"><ShieldCheck size={15} /><span>This record is published by AgriChain Trust from the batch's persisted verification data.</span></footer></article>}</main>
}

export default DashboardPage
