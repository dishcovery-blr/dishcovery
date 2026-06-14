import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Offer } from '../../types/database'

export default function SellerOffers() {
  const { seller } = useAuth()
  const navigate = useNavigate()
  const [offers, setOffers] = useState<Offer[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', expires_at: '' })
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [posterPreview, setPosterPreview] = useState<string | null>(null)

  useEffect(() => {
    if (seller) loadOffers()
  }, [seller])

  async function loadOffers() {
    if (!seller) return
    const { data } = await supabase
      .from('offers')
      .select('*')
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: false })
    setOffers(data ?? [])
  }

  function handlePoster(file: File) {
    setPosterFile(file)
    setPosterPreview(URL.createObjectURL(file))
  }

  async function createOffer() {
    if (!seller || !form.title || !form.expires_at) return
    setSaving(true)

    let photo_urls: string[] = []

    if (posterFile) {
      setUploading(true)
      const ext = posterFile.name.split('.').pop()
      const path = `${seller.auth_user_id}/offers/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('seller-media').upload(path, posterFile)
      if (!uploadErr) photo_urls = [path]
      setUploading(false)
    }

    const { data } = await supabase
      .from('offers')
      .insert({
        seller_id: seller.id,
        title: form.title,
        body: form.body || null,
        expires_at: new Date(form.expires_at).toISOString(),
        is_active: true,
        photo_urls,
      })
      .select()
      .single()

    if (data) setOffers([data, ...offers])
    setForm({ title: '', body: '', expires_at: '' })
    setPosterFile(null)
    setPosterPreview(null)
    setShowForm(false)
    setSaving(false)
  }

  async function deleteOffer(id: string) {
    await supabase.from('offers').delete().eq('id', id)
    setOffers(offers.filter(o => o.id !== id))
  }

  function offerStatus(offer: Offer) {
    if (!offer.is_active) return 'expired'
    if (new Date(offer.expires_at) < new Date()) return 'expired'
    return 'active'
  }

  function defaultExpiry() {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 16)
  }

  function getUrl(path: string) {
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/seller-media/${path}`
  }

  return (
    <div className="editor-page">
      <div className="editor-header">
        <button className="back-btn" onClick={() => navigate('/seller/dashboard')}>← Back</button>
        <h1>Offers</h1>
        <button className="save-btn" onClick={() => { setShowForm(true); setForm({ ...form, expires_at: defaultExpiry() }) }}>
          + New offer
        </button>
      </div>

      <div className="editor-form">
        <p className="section-hint">
          Create limited-time offers with an optional poster image. They appear on your profile and are automatically removed when they expire.
        </p>

        {showForm && (
          <div className="offer-form">
            <h2>New offer</h2>

            {/* Poster upload */}
            <div className="form-group">
              <label>Offer poster (optional)</label>
              <label className="offer-poster-upload">
                {posterPreview
                  ? <img src={posterPreview} alt="Poster preview" className="offer-poster-preview" />
                  : <div className="offer-poster-placeholder">
                      <span>📷</span>
                      <span>Upload a poster or banner image</span>
                    </div>
                }
                <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && handlePoster(e.target.files[0])} />
              </label>
              {posterPreview && (
                <button className="remove-poster-btn" onClick={() => { setPosterFile(null); setPosterPreview(null) }}>
                  Remove image
                </button>
              )}
            </div>

            <div className="form-group">
              <label>Title *</label>
              <input type="text" placeholder="e.g. 20% off all cakes this weekend!" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
            </div>
            <div className="form-group">
              <label>Details (optional)</label>
              <textarea rows={3} placeholder="Any additional details, terms, or how to avail the offer…" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Offer expires at *</label>
              <input type="datetime-local" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} min={new Date().toISOString().slice(0, 16)} />
              <span className="field-hint">The offer is automatically removed from your profile at this time.</span>
            </div>
            <div className="form-actions">
              <button onClick={() => { setShowForm(false); setPosterFile(null); setPosterPreview(null) }}>Cancel</button>
              <button className="btn-primary-sm" onClick={createOffer} disabled={saving || uploading || !form.title || !form.expires_at}>
                {uploading ? 'Uploading…' : saving ? 'Publishing…' : 'Publish offer'}
              </button>
            </div>
          </div>
        )}

        {offers.length === 0 && !showForm ? (
          <div className="offers-empty"><p>No offers yet. Create one to attract customers!</p></div>
        ) : (
          <div className="offers-list">
            {offers.map(offer => {
              const status = offerStatus(offer)
              return (
                <div key={offer.id} className={`offer-card ${status}`}>
                  {offer.photo_urls?.[0] && (
                    <img src={getUrl(offer.photo_urls[0])} alt={offer.title} className="offer-card-poster" />
                  )}
                  <div className="offer-card-header">
                    <span className={`offer-status-badge ${status}`}>{status === 'active' ? '● Live' : '✕ Expired'}</span>
                    <button className="delete-offer-btn" onClick={() => deleteOffer(offer.id)}>Delete</button>
                  </div>
                  <h3 className="offer-card-title">{offer.title}</h3>
                  {offer.body && <p className="offer-card-body">{offer.body}</p>}
                  <div className="offer-card-expiry">
                    {status === 'active' ? 'Expires' : 'Expired'} {new Date(offer.expires_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
