import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const CUISINE_OPTIONS = [
  'Cakes & Pastries', 'Bread & Loaves', 'Cookies & Biscuits', 'Chocolates',
  'South Indian', 'North Indian', 'Continental', 'Chinese', 'Snacks',
  'Healthy & Diet', 'Biryani', 'Desserts', 'Beverages', 'Other',
]
const DIETARY_OPTIONS = [
  'Eggless', 'Vegan', 'Gluten-Free', 'Nut-Free', 'Dairy-Free', 'Jain', 'Keto', 'Low Sugar',
]
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TIMES = ['6am','7am','8am','9am','10am','11am','12pm','1pm','2pm','3pm','4pm','5pm','6pm','7pm','8pm','9pm','10pm']
const EMOJIS = ['🧁','🎂','🍰','🍞','🥐','🍩','🍪','🍫','🍛','🍲','🥗','🍱','🫕','🥘','🍜','🌮','🫔','🥙','🍣','🫙','🌿','✨','🔥','⭐','🏠','👩‍🍳','👨‍🍳','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💗','💓','💞','💕','💝','❤️‍🔥','💫','🌸','🌺','🌻','🍀','🌈']

export default function SellerProfileEdit() {
  const { seller, refreshSeller } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [activeDays, setActiveDays] = useState<string[]>([])
  const [openTime, setOpenTime] = useState('9am')
  const [closeTime, setCloseTime] = useState('8pm')
  const [temporarilyClosed, setTemporarilyClosed] = useState(false)

  const [form, setForm] = useState({
    display_name: '',
    bio: '',
    whatsapp_number: '',
    instagram_url: '',
    location_text: '',
    delivery_radius_km: 5,
    cuisine_tags: [] as string[],
    dietary_tags: [] as string[],
    accepts_custom_orders: true,
    fssai_number: '',
  })

  useEffect(() => {
    if (seller) {
      setForm({
        display_name: seller.display_name ?? '',
        bio: seller.bio ?? '',
        whatsapp_number: seller.whatsapp_number ?? '',
        instagram_url: seller.instagram_url ?? '',
        location_text: seller.location_text ?? '',
        delivery_radius_km: seller.delivery_radius_km ?? 5,
        cuisine_tags: seller.cuisine_tags ?? [],
        dietary_tags: seller.dietary_tags ?? [],
        accepts_custom_orders: seller.accepts_custom_orders ?? true,
        fssai_number: seller.fssai_number ?? '',
      })
      if (seller.operating_hours) {
        if (seller.operating_hours === 'TEMPORARILY_CLOSED') {
          setTemporarilyClosed(true)
        } else {
          const parts = seller.operating_hours.split(' · ')
          if (parts.length === 2) {
            setActiveDays(parts[0].split(', '))
            const times = parts[1].split(' – ')
            if (times.length === 2) {
              setOpenTime(times[0])
              setCloseTime(times[1])
            }
          }
        }
      }
    }
  }, [seller])

  function toggleTag(arr: string[], val: string): string[] {
    return arr.includes(val) ? arr.filter(t => t !== val) : [...arr, val]
  }

  function toggleDay(day: string) {
    setActiveDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  function buildHoursString() {
    if (temporarilyClosed) return 'TEMPORARILY_CLOSED'
    if (activeDays.length === 0) return ''
    const sorted = DAYS.filter(d => activeDays.includes(d))
    return `${sorted.join(', ')} · ${openTime} – ${closeTime}`
  }

  async function handleSave() {
    if (!seller) return
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('sellers')
      .update({
        ...form,
        operating_hours: buildHoursString() || null,
        fssai_status: form.fssai_number && form.fssai_number !== seller.fssai_number
          ? 'in_progress' : seller.fssai_status,
      })
      .eq('id', seller.id)
    if (err) {
      setError(err.message)
    } else {
      await refreshSeller()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  async function uploadImage(file: File, type: 'avatar' | 'cover') {
    if (!seller) return
    const setter = type === 'avatar' ? setUploadingAvatar : setUploadingCover
    setter(true)
    const ext = file.name.split('.').pop()
    const path = `${seller.auth_user_id}/${type}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('seller-media').upload(path, file, { upsert: true })
    if (!uploadErr) {
      const field = type === 'avatar' ? 'avatar_url' : 'cover_photo_url'
      await supabase.from('sellers').update({ [field]: path }).eq('id', seller.id)
      await refreshSeller()
    }
    setter(false)
  }

  if (!seller) return <div className="page-loading">Loading…</div>

  const avatarUrl = seller.avatar_url ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/seller-media/${seller.avatar_url}` : null
  const coverUrl = seller.cover_photo_url ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/seller-media/${seller.cover_photo_url}` : null

  return (
    <div className="editor-page">
      <div className="editor-header">
        <button className="back-btn" onClick={() => navigate('/seller/dashboard')}>← Back</button>
        <h1>Edit profile</h1>
        <button className="save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      {error && <div className="editor-error">{error}</div>}

      {/* Cover + Avatar */}
      <div className="cover-editor">
        <div className="cover-preview" style={{ backgroundImage: coverUrl ? `url(${coverUrl})` : undefined }}>
          {!coverUrl && <span>Cover photo</span>}
          <label className="cover-upload-btn">
            {uploadingCover ? 'Uploading…' : '📷 Change cover'}
            <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'cover')} />
          </label>
        </div>
        <div className="avatar-editor">
          <div className="avatar-preview">
            {avatarUrl ? <img src={avatarUrl} alt="Avatar" /> : <span>{form.display_name.charAt(0) || '?'}</span>}
          </div>
          <label className="avatar-upload-btn">
            {uploadingAvatar ? '…' : '📷'}
            <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'avatar')} />
          </label>
        </div>
      </div>

      <div className="editor-form" style={{ marginTop: 40 }}>

        {/* Basic info */}
        <div className="form-section">
          <h2>Basic info</h2>
          <div className="form-group">
            <label>Display name *</label>
            <input type="text" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Bio</label>
            <textarea
              rows={4}
              value={form.bio}
              onChange={e => setForm({ ...form, bio: e.target.value })}
              placeholder="Tell customers what makes your food special…"
            />
          </div>
          <div className="form-group checkbox-group">
            <label>
              <input type="checkbox" checked={form.accepts_custom_orders} onChange={e => setForm({ ...form, accepts_custom_orders: e.target.checked })} />
              Accept custom orders
            </label>
          </div>
        </div>

        {/* Availability */}
        <div className="form-section">
          <h2>Availability</h2>
          <div className="form-group">
            <label className="checkbox-label" style={{ marginBottom: 12 }}>
              <input type="checkbox" checked={temporarilyClosed} onChange={e => setTemporarilyClosed(e.target.checked)} />
              <span>
                <strong>Temporarily closed</strong>
                <span style={{ display: 'block', fontSize: 12, color: '#888', fontWeight: 400 }}>
                  Pause your listing without losing your profile.
                </span>
              </span>
            </label>
          </div>
          {!temporarilyClosed && (
            <>
              <div className="form-group">
                <label>Days you operate</label>
                <div className="days-grid">
                  {DAYS.map(day => (
                    <button
                      key={day}
                      className={`day-btn ${activeDays.includes(day) ? 'selected' : ''}`}
                      onClick={() => toggleDay(day)}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              {activeDays.length > 0 && (
                <div className="form-group">
                  <label>Operating hours</label>
                  <div className="hours-row">
                    <select value={openTime} onChange={e => setOpenTime(e.target.value)}>
                      {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span>to</span>
                    <select value={closeTime} onChange={e => setCloseTime(e.target.value)}>
                      {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <span className="field-hint">Preview: {DAYS.filter(d => activeDays.includes(d)).join(', ')} · {openTime} – {closeTime}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Contact */}
        <div className="form-section">
          <h2>Contact</h2>
          <div className="form-group">
            <label>WhatsApp number *</label>
            <input type="tel" value={form.whatsapp_number} onChange={e => setForm({ ...form, whatsapp_number: e.target.value })} placeholder="91XXXXXXXXXX" />
          </div>
          <div className="form-group">
            <label>Instagram URL</label>
            <input type="url" value={form.instagram_url} onChange={e => setForm({ ...form, instagram_url: e.target.value })} placeholder="https://instagram.com/yourusername" />
          </div>
        </div>

        {/* Location */}
        <div className="form-section">
          <h2>Location</h2>
          <div className="form-group">
            <label>Your area *</label>
            <input type="text" value={form.location_text} onChange={e => setForm({ ...form, location_text: e.target.value })} placeholder="e.g. Indiranagar, HSR Layout" />
          </div>
          <div className="form-group">
            <label>Delivery radius (km)</label>
            <input type="number" min={1} max={30} value={form.delivery_radius_km} onChange={e => setForm({ ...form, delivery_radius_km: Number(e.target.value) })} />
          </div>
        </div>

        {/* Tags */}
        <div className="form-section">
          <h2>What do you make?</h2>
          <div className="tag-grid">
            {CUISINE_OPTIONS.map(tag => (
              <button key={tag} className={`tag-btn ${form.cuisine_tags.includes(tag) ? 'selected' : ''}`}
                onClick={() => setForm({ ...form, cuisine_tags: toggleTag(form.cuisine_tags, tag) })}>
                {tag}
              </button>
            ))}
          </div>
          <h2 style={{ marginTop: 16 }}>Dietary options</h2>
          <div className="tag-grid">
            {DIETARY_OPTIONS.map(tag => (
              <button key={tag} className={`tag-btn ${form.dietary_tags.includes(tag) ? 'selected' : ''}`}
                onClick={() => setForm({ ...form, dietary_tags: toggleTag(form.dietary_tags, tag) })}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* FSSAI */}
        <div className="form-section">
          <h2>FSSAI</h2>
          <div className="form-group">
            <label>Registration number</label>
            <input type="text" value={form.fssai_number} onChange={e => setForm({ ...form, fssai_number: e.target.value })} placeholder="14-digit registration number" maxLength={14} />
          </div>
        </div>

        <button className="save-btn-full" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}