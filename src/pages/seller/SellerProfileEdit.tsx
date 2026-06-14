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

export default function SellerProfileEdit() {
  const { seller, refreshSeller } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  const [form, setForm] = useState({
    display_name: '',
    bio: '',
    whatsapp_number: '',
    phone_number: '',
    instagram_url: '',
    location_text: '',
    delivery_radius_km: 5,
    operating_hours: '',
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
        phone_number: seller.phone_number ?? '',
        instagram_url: seller.instagram_url ?? '',
        location_text: seller.location_text ?? '',
        delivery_radius_km: seller.delivery_radius_km ?? 5,
        operating_hours: seller.operating_hours ?? '',
        cuisine_tags: seller.cuisine_tags ?? [],
        dietary_tags: seller.dietary_tags ?? [],
        accepts_custom_orders: seller.accepts_custom_orders ?? true,
        fssai_number: seller.fssai_number ?? '',
      })
    }
  }, [seller])

  function toggleTag(arr: string[], val: string): string[] {
    return arr.includes(val) ? arr.filter(t => t !== val) : [...arr, val]
  }

  async function handleSave() {
    if (!seller) return
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('sellers')
      .update({
        ...form,
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
    const { error: uploadErr } = await supabase.storage
      .from('seller-media')
      .upload(path, file, { upsert: true })
    if (!uploadErr) {
      const field = type === 'avatar' ? 'avatar_url' : 'cover_photo_url'
      await supabase.from('sellers').update({ [field]: path }).eq('id', seller.id)
      await refreshSeller()
    }
    setter(false)
  }

  if (!seller) return <div className="page-loading">Loading…</div>

  const avatarUrl = seller.avatar_url
    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/seller-media/${seller.avatar_url}`
    : null
  const coverUrl = seller.cover_photo_url
    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/seller-media/${seller.cover_photo_url}`
    : null

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
        <div className="form-section">
          <h2>Basic info</h2>
          <div className="form-group">
            <label>Display name *</label>
            <input type="text" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Bio</label>
            <textarea rows={4} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Tell customers what makes your food special…" />
          </div>
          <div className="form-group">
            <label>Operating hours</label>
            <input type="text" value={form.operating_hours} onChange={e => setForm({ ...form, operating_hours: e.target.value })} placeholder="e.g. Mon–Sat, 9am–8pm" />
          </div>
          <div className="form-group checkbox-group">
            <label>
              <input type="checkbox" checked={form.accepts_custom_orders} onChange={e => setForm({ ...form, accepts_custom_orders: e.target.checked })} />
              Accept custom orders
            </label>
          </div>
        </div>

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

        <div className="form-section">
          <h2>Location</h2>
          <div className="form-group">
            <label>Area in Bangalore *</label>
            <input type="text" value={form.location_text} onChange={e => setForm({ ...form, location_text: e.target.value })} placeholder="e.g. Indiranagar, HSR Layout" />
          </div>
          <div className="form-group">
            <label>Delivery radius (km)</label>
            <input type="number" min={1} max={30} value={form.delivery_radius_km} onChange={e => setForm({ ...form, delivery_radius_km: Number(e.target.value) })} />
          </div>
        </div>

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

        <div className="form-section">
          <h2>FSSAI</h2>
          <div className="form-group">
            <label>Registration number</label>
            <input type="text" value={form.fssai_number} onChange={e => setForm({ ...form, fssai_number: e.target.value })} placeholder="14-digit registration number" maxLength={14} />
            <span className="field-hint">
              Don't have one? <button className="link-btn" onClick={() => navigate('/seller/fssai')}>Get your FSSAI registration →</button>
            </span>
          </div>
        </div>

        <button className="save-btn-full" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}