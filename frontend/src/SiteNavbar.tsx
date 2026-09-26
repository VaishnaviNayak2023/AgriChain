import { useState } from 'react'
import { ArrowUpRight, Menu, Sprout, X } from 'lucide-react'
import type { Theme } from './App'
import ThemeToggle from './ThemeToggle'

export function Brand() {
  return (
    <a className="home-brand" href="/" aria-label="AgriChain Trust home">
      <span className="home-brand-icon"><Sprout size={18} strokeWidth={2.3} /></span>
      <span>AgriChain <i>Trust</i></span>
    </a>
  )
}

export default function SiteNavbar({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const onHome = window.location.pathname === '/'
  const link = (anchor: string) => onHome ? anchor : `/${anchor}`
  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="home-header">
      <div className="home-nav-shell">
        <Brand />
        <button className="home-menu-toggle" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={`home-nav ${menuOpen ? 'home-nav-open' : ''}`} aria-label="Main navigation">
          <a href={link('#home')} onClick={closeMenu}>Home</a>
          <a href={link('#features')} onClick={closeMenu}>Platform</a>
          <a href={link('#journey')} onClick={closeMenu}>How it works</a>
          <a href={link('#technology')} onClick={closeMenu}>Technology</a>
          <a href={link('#about')} onClick={closeMenu}>About</a>
        </nav>
        <div className="home-nav-actions">
          <a className="home-login-link" href="/login">Sign in</a>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <a className="home-button home-button-small" href="/signup">Get started <ArrowUpRight size={14} /></a>
        </div>
      </div>
    </header>
  )
}
