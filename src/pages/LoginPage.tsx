import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signIn } from '../lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { data, error: err } = await signIn(form.email, form.password)
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    // Navigate immediately from the sign-in response — no auth context race
    const role = (data.user?.user_metadata?.role as string) ?? null
    if (role === 'admin') navigate('/admin', { replace: true })
    else if (role === 'seller') navigate('/seller/dashboard', { replace: true })
    else navigate('/browse', { replace: true })
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><img src="/logo.png" alt="Dishcovery" className="auth-logo-img" /></div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your account</p>

        {error && <div className="auth-error">{error}</div>}

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <button className="auth-btn" onClick={handleLogin} disabled={loading || !form.email || !form.password}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
<div className="auth-links" style={{ marginTop: 8 }}>
  <Link to="/forgot-password">Forgot password?</Link>
</div>
        <div className="auth-links">
          <span>Don't have an account?</span>
          <Link to="/signup">Sign up</Link>
        </div>

        <div className="auth-divider">or</div>

        <Link to="/browse" className="auth-browse-btn">Browse as guest</Link>
      </div>
    </div>
  )
}
