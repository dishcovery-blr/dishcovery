import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUpSeller, signUpConsumer } from '../lib/supabase'

type AccountType = 'seller' | 'consumer' | null

export default function SignupPage() {
  const navigate = useNavigate()
  const [accountType, setAccountType] = useState<AccountType>(null)
  const [form, setForm] = useState({ email: '', password: '', display_name: '', seller_type: 'baker' as 'baker' | 'home_cook' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSignup() {
    if (!accountType) return
    setLoading(true)
    setError('')

    const { error: err } = accountType === 'seller'
      ? await signUpSeller(form.email, form.password, form.seller_type, form.display_name)
      : await signUpConsumer(form.email, form.password, form.display_name)

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo" style={{ textAlign: 'center' }}>
            <img src="/logo.png" alt="Dishcovery" className="auth-logo-img" />
          </div>
          <h1 className="auth-title" style={{ textAlign: 'center' }}>Check your email</h1>
          <p className="auth-subtitle" style={{ textAlign: 'center' }}>
            We've sent a confirmation link to <strong>{form.email}</strong>.
            Click it to verify your account and then sign in.
          </p>
          <Link to="/login" className="auth-btn" style={{ textAlign: 'center', display: 'block' }}>
            Go to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src="/logo.png" alt="Dishcovery" className="auth-logo-img" />
        </div>

        {/* Title */}
        <h1 className="auth-title" style={{ textAlign: 'center' }}>Create account</h1>

        {!accountType ? (
          <>
            <p className="auth-subtitle" style={{ textAlign: 'center' }}>I want to…</p>
            <div className="account-type-cards">
              <button className="account-type-card" onClick={() => setAccountType('seller')}>
                <span className="account-type-icon">🧁</span>
                <strong>List my kitchen</strong>
                <span>I'm a baker, home cook, or cloud kitchen</span>
              </button>
              <button className="account-type-card" onClick={() => setAccountType('consumer')}>
                <span className="account-type-icon">🔍</span>
                <strong>Discover food</strong>
                <span>I want to find home kitchens near me</span>
              </button>
            </div>
            <div className="auth-links">
              <span>Already have an account?</span>
              <Link to="/login">Sign in</Link>
            </div>
          </>
        ) : (
          <>
            <p className="auth-subtitle" style={{ textAlign: 'center' }}>
              {accountType === 'seller' ? 'List your kitchen on Dishcovery' : 'Discover home kitchens near you'}
            </p>

            {error && <div className="auth-error">{error}</div>}

            {accountType === 'seller' && (
              <div className="form-group">
                <label>I am a</label>
                <div className="seller-type-toggle">
                  <button
                    className={`type-toggle-btn ${form.seller_type === 'baker' ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, seller_type: 'baker' })}
                  >
                    🧁 Baker / Cloud Kitchen
                  </button>
                  <button
                    className={`type-toggle-btn ${form.seller_type === 'home_cook' ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, seller_type: 'home_cook' })}
                  >
                    🍛 Home Cook
                  </button>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>{accountType === 'seller' ? 'Your name or brand name' : 'Your name'}</label>
              <input
                type="text"
                placeholder={accountType === 'seller' ? "e.g. Priya's Bake Studio" : 'e.g. Ananya'}
                value={form.display_name}
                onChange={e => setForm({ ...form, display_name: e.target.value })}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSignup()}
              />
            </div>

            <button
              className="auth-btn"
              onClick={handleSignup}
              disabled={loading || !form.email || !form.password || !form.display_name}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>

            <p style={{ fontSize: 12, color: '#888', textAlign: 'center', marginTop: 12 }}>
              By creating an account you agree to our{' '}
              <Link to="/terms" style={{ color: '#1D9E75' }}>Terms & Conditions</Link>
            </p>

            <button className="auth-back-btn" onClick={() => setAccountType(null)}>← Back</button>

            <div className="auth-links">
              <span>Already have an account?</span>
              <Link to="/login">Sign in</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}