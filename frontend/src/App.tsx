import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Leaf,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  Sprout,
  UserRound,
  Wheat,
} from 'lucide-react'
import { authApi, type AuthUser, type UserRole } from './api'
import HomePage from './HomePage'
import SiteNavbar from './SiteNavbar'

type AuthMode = 'login' | 'signup'
export type Theme = 'dark' | 'light'
const DashboardPage = lazy(() => import('./DashboardPage'))
const PublicPassportPage = lazy(() => import('./DashboardPage').then(({ PublicPassportPage }) => ({ default: PublicPassportPage })))

const roles: { value: UserRole; label: string }[] = [
  { value: 'farmer', label: 'Farmer / grower' },
  { value: 'wholesaler', label: 'Wholesaler / distributor' },
  { value: 'retailer', label: 'Retailer / buyer' },
  { value: 'consumer', label: 'Consumer' },
  { value: 'regulator', label: 'Regulator / auditor' },
]

function AccountWelcome({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  return (
    <div className="welcome-state" role="status">
      <span className="welcome-check"><Check size={22} /></span>
      <span className="eyebrow">YOUR ACCOUNT IS READY</span>
      <h1>Welcome to<br /><em>AgriChain Trust.</em></h1>
      <p>You're signed in as <strong>{user.fullName}</strong>. Your {user.role} workspace is ready to grow.</p>
      <div className="welcome-details"><span><BadgeCheck size={17} /> Verified account</span><span>{user.email}</span></div>
      <button className="submit-button" type="button" onClick={onLogout}>Sign out <ArrowRight size={16} /></button>
    </div>
  )
}

function AuthPage({ initialMode, theme, onToggleTheme }: { initialMode: AuthMode; theme: Theme; onToggleTheme: () => void }) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signupRole, setSignupRole] = useState<UserRole>('farmer')

  useEffect(() => {
    let active = true
    authApi.currentUser()
      .then(({ user: current }) => { if (active) setUser(current) })
      .catch(() => undefined)
      .finally(() => { if (active) setLoadingUser(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const syncMode = () => {
      setMode(window.location.pathname === '/signup' ? 'signup' : 'login')
      setError('')
    }
    window.addEventListener('popstate', syncMode)
    return () => window.removeEventListener('popstate', syncMode)
  }, [])

  const switchMode = (next: AuthMode) => {
    window.history.pushState({}, '', next === 'signup' ? '/signup' : '/login')
    setMode(next)
    document.title = next === 'signup' ? 'Create account | AgriChain Trust' : 'Sign in | AgriChain Trust'
    setError('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    if (mode === 'signup' && form.get('password') !== form.get('confirmPassword')) {
      setError('Your passwords do not match.')
      return
    }
    setPending(true)
    try {
      const result = mode === 'login'
        ? await authApi.login({ email: String(form.get('email')), password: String(form.get('password')), rememberMe: form.get('rememberMe') === 'on' })
        : await authApi.register({
            fullName: String(form.get('fullName')),
            email: String(form.get('email')),
            phone: String(form.get('phone')),
            role: signupRole,
            farmName: String(form.get('farmName') ?? ''),
            farmLocation: String(form.get('farmLocation') ?? ''),
            password: String(form.get('password')),
            termsAccepted: form.get('termsAccepted') === 'on',
          })
      setUser(result.user)
      if (result.user.role === 'farmer') {
        window.history.pushState({}, '', '/dashboard')
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to reach AgriChain. Please try again.')
    } finally {
      setPending(false)
    }
  }

  const handleLogout = async () => {
    setPending(true)
    try {
      await authApi.logout()
      setUser(null)
      setPassword('')
      setMode('login')
      window.history.pushState({}, '', '/login')
      window.dispatchEvent(new PopStateEvent('popstate'))
    } catch {
      setError('We could not end this session. Please try again.')
    } finally {
      setPending(false)
    }
  }

  const isSignup = mode === 'signup'

  return (
    <main className="auth-page" id="home">
      <SiteNavbar theme={theme} onToggleTheme={onToggleTheme} />
      <div className="auth-frame">
        <div className="auth-layout">
          <aside className="farm-panel" aria-label="AgriChain farming platform">
            <img className="farm-image" src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1500&q=88" alt="Sunlight over green fields and the surrounding farmland" fetchPriority="high" />
            <div className="farm-shade" />
            <div className="farm-copy"><span className="farm-leaf"><Leaf size={18} /></span><span className="eyebrow">A BETTER WAY TO GROW</span><h2>Growing<br />a better<br />tomorrow.</h2><span className="copy-rule" /><p>Smart solutions for modern farming. Manage, monitor and maximize your yield with technology.</p></div>
            <div className="farm-caption"><span><span className="caption-dot" /> FIELD NOTE 01</span><span>VERIFIED AT THE SOURCE</span></div>
            <div className="benefit-panel" id="features"><div><Sprout size={19} /><strong>Smart farming</strong><span>Data-driven<br />decisions</span></div><div><Wheat size={19} /><strong>Crop health</strong><span>Monitor & protect<br />your crops</span></div><div><BadgeCheck size={19} /><strong>Better yield</strong><span>Increase productivity<br />sustainably</span></div></div>
          </aside>

          <section className="form-panel" aria-live="polite">
            {loadingUser ? <div className="loading-state"><span className="loading-mark"><Sprout size={21} /></span><span>Checking your secure session</span></div> : user ? <AccountWelcome user={user} onLogout={handleLogout} /> : <>
              <div className="form-brand"><a href="/">AgriChain<span className="form-brand-trust">Trust</span></a><p>Connect. Cultivate. Thrive.</p><span className="brand-underline" /></div>
              <div className="form-intro"><span className="eyebrow">{isSignup ? 'GROW WITH US' : 'YOUR FARM, IN FOCUS'}</span><h1>{isSignup ? 'Create your account' : 'Welcome back!'}</h1><p>{isSignup ? 'Join the network growing a more trusted food system.' : 'Sign in to continue your journey.'}</p></div>

              <form className="auth-form" onSubmit={handleSubmit}>
                {isSignup && <>
                  <label className="input-wrap"><UserRound size={15} /><input name="fullName" type="text" placeholder="Full name" autoComplete="name" minLength={2} maxLength={80} required /></label>
                  <label className="input-wrap"><Mail size={15} /><input name="email" type="email" placeholder="Email address" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
                  <label className="input-wrap"><Phone size={15} /><input name="phone" type="tel" placeholder="Phone number (optional)" autoComplete="tel" /></label>
                  <label className="role-label" htmlFor="role">Your role</label>
                  <div className="select-wrap"><UserRound size={15} /><select id="role" name="role" value={signupRole} onChange={(event) => setSignupRole(event.target.value as UserRole)} required>{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select><ChevronDown size={14} /></div>
                  {signupRole === 'farmer' && <>
                    <label className="input-wrap"><Wheat size={15} /><input name="farmName" type="text" placeholder="Farm name (optional)" autoComplete="organization" maxLength={120} /></label>
                    <label className="input-wrap"><Leaf size={15} /><input name="farmLocation" type="text" placeholder="Farm location (optional)" autoComplete="address-level2" maxLength={180} /></label>
                  </>}
                </>}

                {!isSignup && <label className="input-wrap"><Mail size={15} /><input name="email" type="email" placeholder="Email address" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>}
                <label className="input-wrap"><LockKeyhole size={15} /><input name="password" type={showPassword ? 'text' : 'password'} placeholder="Password" autoComplete={isSignup ? 'new-password' : 'current-password'} minLength={8} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} required /><button className="password-toggle" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></label>
                {isSignup && <label className="input-wrap"><LockKeyhole size={15} /><input name="confirmPassword" type={showConfirmation ? 'text' : 'password'} placeholder="Confirm password" autoComplete="new-password" minLength={8} maxLength={72} required /><button className="password-toggle" type="button" onClick={() => setShowConfirmation(!showConfirmation)} aria-label={showConfirmation ? 'Hide confirmation password' : 'Show confirmation password'}>{showConfirmation ? <EyeOff size={15} /> : <Eye size={15} />}</button></label>}

                {!isSignup && <div className="login-options"><label className="check-label"><input name="rememberMe" type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /><span className="custom-check"><Check size={11} /></span>Remember me</label><a href="mailto:help@agrichaintrust.com?subject=Password%20reset">Forgot password?</a></div>}
                {isSignup && <label className="check-label terms-label"><input name="termsAccepted" type="checkbox" required /><span className="custom-check"><Check size={11} /></span><span>I agree to the <a href="#legal">Terms & Conditions</a> and <a href="#legal">Privacy Policy</a></span></label>}
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="submit-button" type="submit" disabled={pending}>{pending ? <><span className="button-spinner" />{isSignup ? 'Creating your account...' : 'Signing in...'}</> : <>{isSignup ? 'Create account' : 'Login'} <ArrowRight size={16} /></>}</button>
              </form>

              <div className="form-switch">{isSignup ? 'Already growing with us?' : 'New to AgriChain?'} <button type="button" onClick={() => switchMode(isSignup ? 'login' : 'signup')}>{isSignup ? 'Sign in' : 'Create an account'}</button></div>
              <div className="security-note"><span className="security-shield"><ShieldCheck size={16} /></span><span><strong>Your data is secure with us</strong><small>We use encrypted connections and protected sessions to keep your information safe.</small></span><Sprout className="security-sprout" size={62} strokeWidth={1} /></div>
            </>}
          </section>
        </div>
        <footer className="auth-footer"><span>© 2026 AGRICHAIN TRUST</span><span id="about">BUILT ON TRUST, ROOTED IN THE FIELD</span><a id="legal" href="mailto:hello@agrichaintrust.com">NEED A HAND? <span>CONTACT US</span></a></footer>
      </div>
    </main>
  )
}

function App() {
  const [pathname, setPathname] = useState(window.location.pathname)
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const syncPath = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', syncPath)
    return () => window.removeEventListener('popstate', syncPath)
  }, [])

  useEffect(() => {
    document.title = pathname.startsWith('/public/passport/')
      ? 'Produce passport | AgriChain Trust'
      : pathname === '/signup'
      ? 'Create account | AgriChain Trust'
      : pathname === '/login'
        ? 'Sign in | AgriChain Trust'
        : 'AgriChain Trust | From farm to your table'
  }, [pathname])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    localStorage.setItem('agrichain-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark')

  if (pathname === '/login' || pathname === '/signup') {
    return <AuthPage initialMode={pathname === '/signup' ? 'signup' : 'login'} theme={theme} onToggleTheme={toggleTheme} />
  }

  if (pathname === '/dashboard') {
    return <Suspense fallback={<main className="dashboard-loading"><span>Loading farmer workspace</span></main>}><DashboardPage theme={theme} onToggleTheme={toggleTheme} onSignedOut={() => {
      window.history.pushState({}, '', '/login')
      setPathname('/login')
    }} /></Suspense>
  }

  if (pathname.startsWith('/public/passport/')) {
    return <Suspense fallback={<main className="dashboard-loading"><span>Loading public passport</span></main>}><PublicPassportPage theme={theme} onToggleTheme={toggleTheme} /></Suspense>
  }

  return <HomePage theme={theme} onToggleTheme={toggleTheme} />
}

export default App
