import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase, signOut } from '../../lib/supabase'

const STORAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/seller-media`

type Section = 'settings' | 'favourites' | 'reviews' | null

interface SavedSeller {
  seller_id: string
  saved_at: string
  sellers: {
    id: string
    display_name: string
    avatar_url: string | null
    location_text: string | null
    seller_type: string
  }
}

interface MyReview {
  id: string
  rating: number
  body: string | null
  created_at: string
  sellers: { id: string; display_name: string; avatar_url: string | null }
}

export default function ConsumerProfile() {
  const navigate = useNavigate()
  const { user, consumer } = useAuth()
  const [openSection, setOpenSection] = useState<Section>(null)

  // Settings state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [settingsMsg, setSettingsMsg] = useState('')
  const [settingsErr, setSettingsErr] = useState('')
  const [saving, setSaving] = useState(false)

  // Data
  const [favourites, setFavourites] = useState<SavedSeller[]>([])
  const [reviews, setReviews] = useState<MyReview[]>([])
  const [dataLoaded, setDataLoaded] = useState<Section>(null)

  async function loadSection(section: Section) {
    if (section === openSection) { setOpenSection(null); return }
    setOpenSection(section)
    if (section === dataLoaded) return

    if (section === 'favourites' && consumer) {
      const { data } = await supabase
        .from('saves')
        .select('seller_id, saved_at, sellers(id, display_name, avatar_url, location_text, seller_type)')
        .eq('consumer_id', consumer.id)
        .order('saved_at', { ascending: false })
      setFavourites((data ?? []) as unknown as SavedSeller[])
      setDataLoaded('favourites')
    }

    if (section === 'reviews' && consumer) {
      const { data } = await supabase
        .from('reviews')
        .select('id, rating, body, created_at, sellers(id, display_name, avatar_url)')
        .eq('consumer_id', consumer.id)
        .order('created_at', { ascending: false })
      setReviews((data ?? []) as unknown as MyReview[])
      setDataLoaded('reviews')
    }
  }

  async function changePassword() {
    if (!newPassword || newPassword !== confirmPassword) {
      setSettingsErr('Passwords do not match'); return
    }
    setSaving(true); setSettingsErr(''); setSettingsMsg('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setSettingsErr(error.message)
    else { setSettingsMsg('Password updated.'); setNewPassword(''); setConfirmPassword('') }
    setSaving(false)
  }

  async function changeEmail() {
    if (!newEmail) return
    setSaving(true); setSettingsErr(''); setSettingsMsg('')
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) setSettingsErr(error.message)
    else { setSettingsMsg('Confirmation sent to new email.'); setNewEmail('') }
    setSaving(false)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  if (!consumer || !user) return <div className="page-loading">Loading…</div>

  const initial = consumer.display_name.charAt(0).toUpperCase()

  return (
    <div className="consumer-profile-page">

      {/* Header */}
      <div className="cp-header">
        <button className="back-btn" onClick={() => navigate('/browse')}>← Back</button>
        <div className="cp-avatar">{initial}</div>
        <h1 className="cp-name">{consumer.display_name}</h1>
        <p className="cp-email">{user.email}</p>
      </div>

      {/* Menu list */}
      <div className="cp-menu">

        {/* Settings */}
        <div className="cp-section">
          <button className="cp-section-header" onClick={() => loadSection('settings')}>
            <span>Settings</span>
            <span className="cp-chevron">{openSection === 'settings' ? '▲' : '▼'}</span>
          </button>
          {openSection === 'settings' && (
            <div className="cp-section-body">
              {settingsMsg && <div className="field-hint success">{settingsMsg}</div>}
              {settingsErr && <div className="editor-error">{settingsErr}</div>}

              <div className="cp-settings-group">
                <p className="cp-settings-label">Change Password</p>
                <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                <button className="btn-primary-sm" onClick={changePassword} disabled={saving}>Update password</button>
              </div>

              <div className="cp-settings-group">
                <p className="cp-settings-label">Change Email ID</p>
                <input type="email" placeholder="New email address" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                <button className="btn-primary-sm" onClick={changeEmail} disabled={saving}>Send confirmation</button>
              </div>

              <div className="cp-settings-group">
                <p className="cp-settings-label">Notifications</p>
                <p className="cp-placeholder-text">Coming soon</p>
              </div>
            </div>
          )}
        </div>

        {/* Favourites */}
        <div className="cp-section">
          <button className="cp-section-header" onClick={() => loadSection('favourites')}>
            <span>Favourites</span>
            <span className="cp-chevron">{openSection === 'favourites' ? '▲' : '▼'}</span>
          </button>
          {openSection === 'favourites' && (
            <div className="cp-section-body">
              {favourites.length === 0 ? (
                <p className="cp-placeholder-text">No saved kitchens yet. Tap the heart on any seller page to save them.</p>
              ) : (
                <div className="cp-seller-list">
                  {favourites.map(f => {
                    const s = f.sellers
                    const avatarUrl = s.avatar_url ? `${STORAGE_URL}/${s.avatar_url}` : null
                    return (
                      <div key={f.seller_id} className="cp-seller-row" onClick={() => navigate(`/seller/${s.id}`)}>
                        <div className="cp-seller-avatar">
                          {avatarUrl ? <img src={avatarUrl} alt={s.display_name} /> : <span>{s.display_name.charAt(0)}</span>}
                        </div>
                        <div className="cp-seller-info">
                          <p className="cp-seller-name">{s.display_name}</p>
                          <p className="cp-seller-loc">{s.location_text ?? 'Bangalore'}</p>
                        </div>
                        <span className="cp-chevron">›</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Past Orders */}
        <div className="cp-section">
          <button className="cp-section-header cp-disabled">
            <span>Past Orders</span>
            <span className="cp-coming-soon">Coming soon</span>
          </button>
        </div>

        {/* My Reviews */}
        <div className="cp-section">
          <button className="cp-section-header" onClick={() => loadSection('reviews')}>
            <span>My Reviews</span>
            <span className="cp-chevron">{openSection === 'reviews' ? '▲' : '▼'}</span>
          </button>
          {openSection === 'reviews' && (
            <div className="cp-section-body">
              {reviews.length === 0 ? (
                <p className="cp-placeholder-text">You haven't reviewed any kitchens yet.</p>
              ) : (
                <div className="cp-review-list">
                  {reviews.map(r => {
                    const s = r.sellers
                    const avatarUrl = s.avatar_url ? `${STORAGE_URL}/${s.avatar_url}` : null
                    return (
                      <div key={r.id} className="cp-review-row" onClick={() => navigate(`/seller/${s.id}`)}>
                        <div className="cp-seller-avatar">
                          {avatarUrl ? <img src={avatarUrl} alt={s.display_name} /> : <span>{s.display_name.charAt(0)}</span>}
                        </div>
                        <div className="cp-review-info">
                          <p className="cp-seller-name">{s.display_name}</p>
                          <p className="cp-review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
                          {r.body && <p className="cp-review-body">{r.body}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Help */}
        <div className="cp-section">
          <a className="cp-section-header cp-link" href="mailto:dishcovery.blr@gmail.com">
            <span>Help</span>
            <span className="cp-chevron">›</span>
          </a>
        </div>

        {/* Logout */}
        <div className="cp-section">
          <button className="cp-section-header cp-logout" onClick={handleSignOut}>
            <span>Log out</span>
          </button>
        </div>

      </div>
    </div>
  )
}
