import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signUpVendor } from '../../lib/supabase'

export default function VendorSignup() {
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    password: '',
    whatsapp_number: '',
    website_url: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSignup() {
    if (!form.company_name || !form.contact_name || !form.email || !form.password) {
      setError('Please fill in all required fields.')
      return
    }
    setLoading(true)
    setError('')

    const { error: err } = await signUpVendor(
      form.email, form.password,
      form.company_name, form.contact_name,
      form.whatsapp_number, form.website_url,
    )

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
          <div className="auth-logo"><img src="/logo.png" alt="Dishcovery" className="auth-logo-img" /></div>
          <h1 className="auth-title" style={{ textAlign: 'center' }}>Check your email</h1>
          <p className="auth-subtitle" style={{ textAlign: 'center' }}>
            We've sent a confirmation link to <strong>{form.email}</strong>.
            Click it to verify your account, then sign in.
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
        <div className="auth-logo"><img src="/logo.png" alt="Dishcovery" className="auth-logo-img" /></div>
        <h1 className="auth-title">Advertise to sellers</h1>
        <p className="auth-subtitle">Create a vendor account to run ads on Dishcovery</p>

        {error && <div className="auth-error">{error}</div>}

        <div className="form-group">
          <label>Company / Brand name <span style={{ color: '#E24B4A' }}>*</span></label>
          <input type="text" placeholder="e.g. FreshBake Supplies" value={form.company_name} onChange={e => set('company_name', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Contact name <span style={{ color: '#E24B4A' }}>*</span></label>
          <input type="text" placeholder="Your name" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Email <span style={{ color: '#E24B4A' }}>*</span></label>
          <input type="email" placeholder="you@company.com" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Password <span style={{ color: '#E24B4A' }}>*</span></label>
          <input type="password" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} />
        </div>
        <div className="form-group">
          <label>WhatsApp number <span className="field-optional">(optional)</span></label>
          <input type="tel" placeholder="+91 98765 43210" value={form.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Website URL <span className="field-optional">(optional)</span></label>
          <input type="url" placeholder="https://yourcompany.com" value={form.website_url} onChange={e => set('website_url', e.target.value)} />
        </div>

        <button
          className="auth-btn"
          onClick={handleSignup}
          disabled={loading || !form.company_name || !form.contact_name || !form.email || !form.password}
        >
          {loading ? 'Creating account…' : 'Create vendor account'}
        </button>

        <div className="auth-links">
          <span>Already have an account?</span>
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
