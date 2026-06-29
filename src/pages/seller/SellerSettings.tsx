import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function SellerSettings() {
  const navigate = useNavigate()

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')

  const [emailForm, setEmailForm] = useState({ email: '' })
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')

  async function changePassword() {
    if (!pwForm.next || pwForm.next !== pwForm.confirm) {
      setPwMsg('Passwords do not match.')
      return
    }
    if (pwForm.next.length < 8) {
      setPwMsg('Password must be at least 8 characters.')
      return
    }
    setPwSaving(true)
    setPwMsg('')
    const { error } = await supabase.auth.updateUser({ password: pwForm.next })
    if (error) setPwMsg(error.message)
    else { setPwMsg('Password updated successfully.'); setPwForm({ current: '', next: '', confirm: '' }) }
    setPwSaving(false)
  }

  async function changeEmail() {
    if (!emailForm.email) return
    setEmailSaving(true)
    setEmailMsg('')
    const { error } = await supabase.auth.updateUser({ email: emailForm.email })
    if (error) setEmailMsg(error.message)
    else { setEmailMsg('Confirmation sent to your new email address. Click the link to confirm the change.'); setEmailForm({ email: '' }) }
    setEmailSaving(false)
  }

  return (
    <div className="editor-page">
      <div className="editor-header">
        <button className="back-btn" onClick={() => navigate('/seller/dashboard')}>← Back</button>
        <h1>Settings</h1>
      </div>

      <div className="editor-form">

        <div className="form-section">
          <h2>Change password</h2>
          <div className="form-group">
            <label>New password</label>
            <input type="password" value={pwForm.next} onChange={e => setPwForm({ ...pwForm, next: e.target.value })} placeholder="At least 8 characters" />
          </div>
          <div className="form-group">
            <label>Confirm new password</label>
            <input type="password" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} />
          </div>
          {pwMsg && <p className={pwMsg.includes('successfully') ? 'field-hint success' : 'editor-error'}>{pwMsg}</p>}
          <button className="btn-primary-sm" onClick={changePassword} disabled={pwSaving || !pwForm.next || !pwForm.confirm}>
            {pwSaving ? 'Saving…' : 'Update password'}
          </button>
        </div>

        <div className="form-section">
          <h2>Change email address</h2>
          <div className="form-group">
            <label>New email address</label>
            <input type="email" value={emailForm.email} onChange={e => setEmailForm({ email: e.target.value })} placeholder="your@email.com" />
            <span className="field-hint">A confirmation link will be sent to your new address.</span>
          </div>
          {emailMsg && <p className={emailMsg.includes('Confirmation') ? 'field-hint success' : 'editor-error'}>{emailMsg}</p>}
          <button className="btn-primary-sm" onClick={changeEmail} disabled={emailSaving || !emailForm.email}>
            {emailSaving ? 'Sending…' : 'Update email'}
          </button>
        </div>

        <div className="form-section">
          <h2>Notifications</h2>
          <p className="section-hint">Notification preferences coming soon.</p>
        </div>

      </div>
    </div>
  )
}
