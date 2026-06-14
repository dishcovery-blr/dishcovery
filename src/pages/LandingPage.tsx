import { useNavigate } from 'react-router-dom'

const CATEGORIES = [
  { emoji: '🎂', label: 'Cakes' },
  { emoji: '🍞', label: 'Breads' },
  { emoji: '🍛', label: 'Home meals' },
  { emoji: '🍫', label: 'Chocolates' },
  { emoji: '🥗', label: 'Healthy' },
  { emoji: '🍪', label: 'Cookies' },
  { emoji: '🍱', label: 'Biryani' },
  { emoji: '🧁', label: 'Cupcakes' },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="landing-page">

      {/* Hero */}
      <div className="landing-hero">
        <div className="landing-logo-wrap">
          <img src="/logo.png" alt="Dishcovery" className="landing-logo" />
        </div>
        <h1 className="landing-headline">
          Discover home kitchens<br />near you in Bangalore
        </h1>
        <p className="landing-sub">
          Order directly from home bakers, home cooks and cloud kitchens. No commissions. Pure food.
        </p>
        <div className="landing-ctas">
          <button className="landing-btn-primary" onClick={() => navigate('/signup')}>
            Create an account
          </button>
          <button className="landing-btn-secondary" onClick={() => navigate('/login')}>
            Sign in
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="landing-categories">
        <h2>What are you craving?</h2>
        <div className="landing-cat-grid">
          {CATEGORIES.map(cat => (
            <button
              key={cat.label}
              className="landing-cat-item"
              onClick={() => navigate('/signup')}
            >
              <span className="landing-cat-emoji">{cat.emoji}</span>
              <span className="landing-cat-label">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Why Dishcovery */}
      <div className="landing-why">
        <h2>Why Dishcovery?</h2>
        <div className="landing-why-grid">
          <div className="landing-why-card">
            <span>💬</span>
            <h3>Order directly</h3>
            <p>Contact the kitchen directly on WhatsApp. No middlemen, no platform fees on your order.</p>
          </div>
          <div className="landing-why-card">
            <span>✓</span>
            <h3>Verified kitchens</h3>
            <p>Every listing is reviewed by us. FSSAI registered kitchens are clearly marked.</p>
          </div>
          <div className="landing-why-card">
            <span>🏷</span>
            <h3>Live offers</h3>
            <p>See real-time deals and limited-time offers from kitchens near you.</p>
          </div>
          <div className="landing-why-card">
            <span>📍</span>
            <h3>Hyperlocal</h3>
            <p>Bangalore-first. Find home kitchens in your neighbourhood.</p>
          </div>
        </div>
      </div>

      {/* For sellers */}
      <div className="landing-seller-cta">
        <h2>Are you a home baker or cook?</h2>
        <p>Get discovered by thousands of food lovers in Bangalore. List your kitchen free for 30 days.</p>
        <button className="landing-btn-primary" onClick={() => navigate('/signup')}>
          Start your free listing
        </button>
      </div>

      {/* Footer */}
      <div className="landing-footer">
        <img src="/logo.png" alt="Dishcovery" className="landing-footer-logo" />
        <p>Bangalore's home kitchen discovery platform</p>
        <div className="landing-footer-links">
          <button onClick={() => navigate('/login')}>Sign in</button>
          <button onClick={() => navigate('/signup')}>Create account</button>
        </div>
      </div>

    </div>
  )
}