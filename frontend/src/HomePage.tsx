import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Blocks,
  Boxes,
  Check,
  Leaf,
  ScanLine,
  ShieldCheck,
  Sprout,
  Truck,
  Wheat,
} from 'lucide-react'
import SiteNavbar, { Brand } from './SiteNavbar'
import type { Theme } from './App'
import './home.css'

const heroImage = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=2400&q=88'
const fieldImage = 'https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1700&q=85'

const features = [
  { icon: ScanLine, label: '01 / QUALITY', title: 'See the quality.', description: 'AI-assisted grading brings freshness and condition into focus at every checkpoint.' },
  { icon: Blocks, label: '02 / PROVENANCE', title: 'Trust the record.', description: 'Blockchain-backed batch identities keep every handoff connected and verifiable.' },
  { icon: ShieldCheck, label: '03 / CONFIDENCE', title: 'Share what matters.', description: 'Give each partner the proof they need, while keeping sensitive details protected.' },
]

const steps = [
  { icon: Sprout, title: 'Grown', copy: 'A farm and harvest are registered.' },
  { icon: ScanLine, title: 'Verified', copy: 'Quality and origin are recorded.' },
  { icon: Truck, title: 'In motion', copy: 'Each handoff joins the same record.' },
  { icon: Boxes, title: 'Received', copy: 'Buyers check the batch before stocking.' },
  { icon: Leaf, title: 'Enjoyed', copy: 'A scan shares the story with everyone.' },
]

export default function HomePage({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  return (
    <main className="home-page">
      <SiteNavbar theme={theme} onToggleTheme={onToggleTheme} />

      <section className="home-hero" id="home" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="home-hero-shade" />
        <div className="home-hero-content">
          <div className="home-trust-tag"><span /> FOOD, WITH NOTHING TO HIDE</div>
          <p className="home-hero-eyebrow">A more connected food system starts at the source.</p>
          <h1>Know where it grew.<br /><em>Trust where it goes.</em></h1>
          <p className="home-hero-description">AgriChain connects farms, buyers, and consumers with AI-assisted quality insights and a verifiable record for every harvest.</p>
          <div className="home-hero-actions">
            <a href="/signup" className="home-button">Create your account <ArrowRight size={16} /></a>
            <a href="#journey" className="home-text-button">Explore the journey <ArrowDown size={15} /></a>
          </div>
          <div className="home-hero-proof"><span><BadgeCheck size={15} /> Verified at every handoff</span><i /><span><Wheat size={15} /> Built around the people who grow</span></div>
        </div>
        <div className="home-verify-card"><span className="home-verify-icon"><ShieldCheck size={17} /></span><span><strong>Batch identity verified</strong><small>Origin record · just now</small></span><Check size={14} /></div>
        <div className="home-score-card"><span className="home-score-ring">96</span><span><strong>Freshness insight</strong><small>AI-assisted quality grade</small></span><span className="home-score-arrow"><ArrowUpRight size={15} /></span></div>
        <div className="home-hero-foot"><a href="#impact" aria-label="Scroll to platform overview"><ArrowDown size={15} /></a></div>
      </section>

      <section className="home-impact" id="impact" aria-label="A connected food journey">
        <div className="home-impact-inner">
          <div className="home-impact-intro"><span className="home-kicker">THE AGRICHAIN PROMISE</span><p>One harvest.<br />A story everyone can trust.</p></div>
          <div className="home-impact-stat"><strong>01</strong><span>digital identity<br />for every batch</span></div>
          <div className="home-impact-stat"><strong>05</strong><span>connected journey<br />checkpoints</span></div>
          <div className="home-impact-stat"><strong>∞</strong><span>ways to build<br />better together</span></div>
        </div>
      </section>

      <section className="home-section home-features" id="features">
        <div className="home-section-heading">
          <div><span className="home-kicker">A BETTER KIND OF VISIBILITY</span><h2>From hidden steps<br />to <em>shared confidence.</em></h2></div>
          <p>Every link in the food chain deserves a clearer view. AgriChain brings the important details together without making the work more complicated.</p>
        </div>
        <div className="home-feature-grid">
          {features.map(({ icon: Icon, label, title, description }) => (
            <article className="home-feature" key={title}>
              <div className="home-feature-top"><span><Icon size={20} /></span><small>{label}</small></div>
              <h3>{title}</h3><p>{description}</p>
              <a href="/signup" aria-label={`Get started with ${title.toLowerCase()}`}><ArrowUpRight size={17} /></a>
            </article>
          ))}
        </div>
        <div className="home-proof-line"><span /> CONNECTED BY DESIGN <i /> VERIFIED AT EVERY STEP</div>
      </section>

      <section className="home-journey" id="journey">
        <div className="home-section home-journey-inner">
          <div className="home-journey-heading"><span className="home-kicker">FROM FARM TO YOUR TABLE</span><h2>A journey worth<br /><em>knowing by heart.</em></h2><p>Each stop adds context. Each verified handoff makes the next one easier to trust.</p><a className="home-inline-link" href="/signup">Follow your first harvest <ArrowRight size={15} /></a></div>
          <div className="home-journey-visual" style={{ backgroundImage: `url(${fieldImage})` }}><div className="home-journey-photo-shade" /><div className="home-journey-caption"><span><span /> FIELD NOTE 01</span><span>GROWN WITH CARE</span></div></div>
          <div className="home-steps">
            {steps.map(({ icon: Icon, title, copy }, index) => <article className="home-step" key={title}><span className="home-step-track"><i><Icon size={16} /></i>{index < steps.length - 1 && <b />}</span><span className="home-step-copy"><small>0{index + 1} / {['ORIGIN', 'QUALITY', 'JOURNEY', 'ARRIVAL', 'PROOF'][index]}</small><strong>{title}</strong><span>{copy}</span></span></article>)}
          </div>
        </div>
      </section>

      <section className="home-tech home-section" id="technology">
        <div className="home-tech-visual">
          <div className="home-dashboard">
            <div className="home-dashboard-bar"><span><i><Leaf size={11} /></i> AGRICHAIN / HARVEST 02481</span><small><b /> VERIFIED BATCH</small></div>
            <div className="home-dashboard-photo" style={{ backgroundImage: `url(${heroImage})` }}><span>ORGANIC / TOMATOES</span><b><strong>96</strong><small>FRESHNESS</small></b></div>
            <div className="home-dashboard-data"><div className="home-chart-title"><span>QUALITY THROUGH THE JOURNEY</span><small>AI INSIGHT</small></div><div className="home-chart"><div /><div /><div /><svg viewBox="0 0 500 110" preserveAspectRatio="none" aria-label="Quality trend rising across checkpoints"><defs><linearGradient id="home-chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8bd77d" stopOpacity=".24" /><stop offset="1" stopColor="#8bd77d" stopOpacity="0" /></linearGradient></defs><path d="M0 84 C48 79 49 53 104 67 S165 59 205 49 S269 63 302 35 S362 44 398 27 S455 41 500 12 L500 110 L0 110Z" fill="url(#home-chart-fill)" /><path d="M0 84 C48 79 49 53 104 67 S165 59 205 49 S269 63 302 35 S362 44 398 27 S455 41 500 12" fill="none" stroke="#9bdc82" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg></div><div className="home-chart-footer"><span>ORIGIN</span><span>PACKING</span><span>IN TRANSIT</span><span>RETAIL</span></div></div>
            <div className="home-dashboard-footer"><span><ShieldCheck size={12} /> ON-CHAIN RECORD</span><span>UPDATED JUST NOW</span></div>
          </div>
          <div className="home-tech-float"><span><Check size={13} /></span> Origin verified</div>
        </div>
        <div className="home-tech-copy"><span className="home-kicker">INTELLIGENCE WITH INTEGRITY</span><h2>Technology that<br />keeps its <em>word.</em></h2><p>AI can help make quality visible. Blockchain can help keep records honest. AgriChain brings both into one practical tool for the people moving food forward.</p><ul><li><Check size={14} /> AI-assisted quality grading</li><li><Check size={14} /> Immutable batch verification</li><li><Check size={14} /> Private, permission-aware sharing</li></ul><a className="home-inline-link" href="/signup">See what your team can do <ArrowRight size={15} /></a></div>
      </section>

      <section className="home-about" id="about">
        <div className="home-about-inner"><span className="home-kicker">GROWN FROM A SIMPLE BELIEF</span><h2>Trust shouldn't be<br />another thing to <em>guess at.</em></h2><p>We believe the people who grow, move, and choose our food deserve a clearer way to know it. AgriChain is built to put that story within reach.</p><a className="home-button" href="/signup">Join the network <ArrowUpRight size={16} /></a></div>
        <div className="home-about-stamp"><Sprout size={21} /><span>ROOTED IN THE FIELD<br />BUILT FOR WHAT'S NEXT</span></div>
      </section>

      <footer className="home-footer" id="contact">
        <div className="home-footer-main"><div><Brand /><p>A clearer story for every harvest,<br />from the field to the people it feeds.</p><a className="home-footer-email" href="mailto:hello@agrichaintrust.com">hello@agrichaintrust.com <ArrowUpRight size={13} /></a></div><div className="home-footer-links"><div><span>PLATFORM</span><a href="#features">Features</a><a href="#journey">How it works</a><a href="#technology">Technology</a></div><div><span>GET STARTED</span><a href="/login">Sign in</a><a href="/signup">Create account</a><a href="mailto:hello@agrichaintrust.com">Contact</a></div></div><div className="home-footer-cta"><span className="home-kicker">READY WHEN YOU ARE</span><p>Bring your part of the food system into focus.</p><a href="/signup">Get started <ArrowRight size={14} /></a></div></div>
        <div className="home-footer-bottom"><span>© 2026 AGRICHAIN TRUST</span><span>GROWN WITH CARE. VERIFIED WITH CONFIDENCE. <Wheat size={13} /></span><a href="/login">ACCOUNT LOGIN <ArrowUpRight size={12} /></a></div>
      </footer>
    </main>
  )
}
