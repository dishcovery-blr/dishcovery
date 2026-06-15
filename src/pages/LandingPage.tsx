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
  Your neighbourhood kitchens, discovered.
</h1>
<p className="landing-sub">
  FIND. ORDER. INDULGE.
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
      
      {/* Why Dishcovery */}
      <div className="landing-features">
  <img src="/feature-order.png" alt="Order directly" className="feature-img" />
  <img src="/feature-verified.png" alt="Verified kitchens" className="feature-img" />
  <img src="/feature-offers.png" alt="Live offers" className="feature-img" />
  <img src="/feature-hyperlocal.png" alt="Hyperlocal" className="feature-img" />
</div>

      {/* For sellers */}
      

      {/* Footer */}
      <div className="landing-footer">
        <img src="/logo.png" alt="Dishcovery" className="landing-footer-logo" />
        <p>Your home kitchen discovery platform</p>
        <div className="landing-footer-links">
          <button onClick={() => navigate('/login')}>Sign in</button>
          <button onClick={() => navigate('/signup')}>Create account</button>
        </div>
      </div>

    </div>
  )
}