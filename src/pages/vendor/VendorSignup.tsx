import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signUpVendor, supabase } from '../../lib/supabase'

export default function VendorSignup() {
  const navigate = useNavigate()
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

    const { data, error: signupErr } = await signUpVendor(
      form.email, form.password,
      form.company_name, form.contact_name,
      form.whatsapp_number, form.website_url,
    )
    if (signupErr) { setError(signupErr.message); setLoading(false); return }

    // Create vendor profile row
    const userId = data.user?.id
    if (userId) {
      await supabase.from('vendors').insert({
        auth_user_id: userId,
        company_name: form.company_name,
        contact_name: form.contact_name,
        whatsapp_number: form.whatsapp_number || null,
        website_url: form.website_url || null,
      })
    }

    navigate('/vendor/dashboard', { replace: true })
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
