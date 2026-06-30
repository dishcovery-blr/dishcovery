import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useRequireVendor } from '../../context/AuthContext'
import { supabase, signOut, createVendorAdBoost } from '../../lib/supabase'
import type { VendorAd, VendorAdBoost } from '../../types/database'

type AdWithBoost = VendorAd & { vendor_ad_boosts: VendorAdBoost[] }
type AdType = 'listing' | 'banner' | 'splash'
type CtaType = 'url' | 'whatsapp'

const STORAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/seller-media`

const AD_PRICES: Record<AdType, number> = {
  listing: 999,
  banner: 4999,
  splash: 9999,
}

const AD_LABELS: Record<AdType, string> = {
  listing: 'Vendor Listing (Tier 1)',
  banner: 'Floating Banner (Tier 2)',
  splash: 'Splash Screen (Tier 3)',
}

const AD_DESCS: Record<AdType, string> = {
  listing: 'Your ad appears in the Vendor Deals section every seller sees on their dashboard',
  banner: 'A prominent floating banner at the top of the seller dashboard',
  splash: 'Full-screen takeover when a seller opens their dashboard',
}

function activeBoost(ad: AdWithBoost): VendorAdBoost | null {
  const now = new Date()
  return ad.vendor_ad_boosts?.find(b =>
    b.payment_status === 'paid' &&
    b.starts_at && new Date(b.starts_at) <= now &&
    b.ends_at && new Date(b.ends_at) > now
  ) ?? null
}

export default function VendorDashboard() {
  const navigate = useNavigate()
  const { vendor } = useRequireVendor()
  const { user } = useAuth()

  const [ads, setAds] = useState<AdWithBoost[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [adType, setAdType] = useState<AdType>('listing')
  const [days, setDays] = useState(1)
  const [form, setForm] = useState({ title: '', body: '', cta_type: 'url' as CtaType, cta_value: '' })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  useEffect(() => {
    if (vendor) loadAds()
  }, [vendor?.id])

  async function loadAds() {
    if (!vendor) return
    const { data } = await supabase
      .from('vendor_ads')
      .select('*, vendor_ad_boosts(*)')
      .eq('vendor_id', vendor.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    setAds((data ?? []) as AdWithBoost[])
    setLoading(false)
  }

  function closeForm() {
    setShowForm(false)
    setForm({ title: '', body: '', cta_type: 'url', cta_value: '' })
    setPhotoFile(null)
    setPhotoPreview(null)
    setAdType('listing')
    setDays(1)
  }

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function publish() {
    if (!vendor || !form.title || !form.cta_value) return
    setSaving(true)

    let photo_url: string | null = null
    if (photoFile) {
      setUploading(true)
      const ext = photoFile.name.split('.').pop()
      const path = `vendor/${vendor.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('seller-media').upload(path, photoFile)
      if (!uploadErr) photo_url = path
      setUploading(false)
    }

    const { data: adData, error: adErr } = await supabase
      .from('vendor_ads')
      .insert({
        vendor_id: vendor.id,
        title: form.title,
        body: form.body || null,
        photo_url,
        ad_type: adType,
        cta_type: form.cta_type,
        cta_value: form.cta_value,
      })
      .select('*, vendor_ad_boosts(*)')
      .single()

    if (!adErr && adData) {
      await createVendorAdBoost({
        adId: adData.id,
        vendorId: vendor.id,
        adType,
        daysPurchased: days,
        amountPaise: AD_PRICES[adType] * days * 100,
      })
      // Reload to get boost
      const { data: fresh } = await supabase
        .from('vendor_ads')
        .select('*, vendor_ad_boosts(*)')
        .eq('id', adData.id)
        .single()
      if (fresh) setAds(prev => [fresh as AdWithBoost, ...prev])
    }

    closeForm()
    setSaving(false)
  }

  async function remove(id: string) {
    await supabase.from('vendor_ads').update({ is_active: false }).eq('id', id)
    setAds(prev => prev.filter(a => a.id !== id))
  }

  const total = AD_PRICES[adType] * days

  if (!vendor) return <div className="page-loading">Loading…</div>

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">{vendor.company_name}</h1>
          <p className="dashboard-subtitle">Vendor ad portal</p>
        </div>
        {!showForm && (
          <button className="btn-primary-sm" onClick={() => setShowForm(true)}>+ New ad</button>
        )}
      </div>

      {/* ── Ad creation form ── */}
      {showForm && (
        <div className="announcements-form">
          <h2>Create new ad</h2>

          {/* Ad type */}
          <div className="form-group">
            <label>Ad placement</label>
            <div className="tier-selector">
              {(['listing', 'banner', 'splash'] as AdType[]).map(t => (
                <button
                  key={t}
                  className={`tier-btn ${adType === t ? 'active' : ''}`}
                  onClick={() => setAdType(t)}
                >
                  <span className="tier-btn-name">{AD_LABELS[t]}</span>
                  <span className="tier-btn-price">₹{AD_PRICES[t].toLocaleString('en-IN')}/day</span>
                  <span className="tier-btn-desc">{AD_DESCS[t]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="form-group">
            <label>Headline <span style={{ color: '#E24B4A' }}>*</span></label>
            <input
              type="text" maxLength={80}
              placeholder="e.g. Premium baking tools — 20% off for Dishcovery sellers"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>

          {/* Body */}
          <div className="form-group">
            <label>Description <span className="field-optional">(optional)</span></label>
            <textarea
              rows={3} maxLength={300}
              placeholder="More details about your offer…"
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            />
          </div>

          {/* Photo */}
          <div className="form-group">
            <label>Image <span className="field-optional">(optional)</span></label>
            {photoPreview && <img src={photoPreview} alt="" className="poster-preview" />}
            <input type="file" accept="image/*" onChange={onPhotoChange} />
          </div>

          {/* CTA */}
          <div className="form-group">
            <label>Call to action type <span style={{ color: '#E24B4A' }}>*</span></label>
            <div className="cta-type-row">
              <button
                className={`cta-type-btn ${form.cta_type === 'url' ? 'active' : ''}`}
                onClick={() => setForm(f => ({ ...f, cta_type: 'url', cta_value: '' }))}
              >🌐 Website link</button>
              <button
                className={`cta-type-btn ${form.cta_type === 'whatsapp' ? 'active' : ''}`}
                onClick={() => setForm(f => ({ ...f, cta_type: 'whatsapp', cta_value: '' }))}
              >💬 WhatsApp</button>
            </div>
            <input
              type={form.cta_type === 'url' ? 'url' : 'tel'}
              placeholder={form.cta_type === 'url' ? 'https://yoursite.com' : '+91 98765 43210'}
              value={form.cta_value}
              onChange={e => setForm(f => ({ ...f, cta_value: e.target.value }))}
              style={{ marginTop: 8 }}
            />
          </div>

          {/* Days */}
          <div className="form-group">
            <label>Number of days</label>
            <div className="boost-days-row">
              <input
                type="number" min={1} max={30}
                value={days}
                onChange={e => setDays(Math.max(1, Math.min(30, Number(e.target.value))))}
              />
              <span className="boost-total">Total: ₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="form-actions">
            <button onClick={closeForm}>Cancel</button>
            <button
              className="btn-primary-sm"
              onClick={publish}
              disabled={saving || uploading || !form.title || !form.cta_value}
            >
              {uploading ? 'Uploading…' : saving ? 'Publishing…' : 'Publish ad'}
            </button>
          </div>
        </div>
      )}

      {/* ── Active ads list ── */}
      <h2 className="section-title" style={{ marginTop: 24 }}>Your ads</h2>

      {loading ? (
        <div className="page-loading" style={{ minHeight: 80 }}>Loading…</div>
      ) : ads.length === 0 ? (
        <div className="browse-empty">
          <p>No active ads yet. Create your first ad to start reaching sellers.</p>
        </div>
      ) : (
        <div className="vendor-ads-list">
          {ads.map(ad => {
            const boost = activeBoost(ad)
            const isLive = !!boost
            return (
              <div key={ad.id} className={`offer-card ${isLive ? 'active' : 'expired'}`}>
                {ad.photo_url && (
                  <img src={`${STORAGE_URL}/${ad.photo_url}`} alt={ad.title} className="offer-card-poster" />
                )}
                <div className="offer-card-header">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`offer-status-badge ${isLive ? 'active' : 'expired'}`}>
                      {isLive ? '● Live' : '✕ Not live'}
                    </span>
                    <span className="vendor-ad-type-badge">{AD_LABELS[ad.ad_type]}</span>
                  </div>
                  <button className="delete-offer-btn" onClick={() => remove(ad.id)}>Remove</button>
                </div>
                <h3 className="offer-card-title">{ad.title}</h3>
                {ad.body && <p className="offer-card-body">{ad.body}</p>}
                <p className="offer-card-expiry">
                  {ad.cta_type === 'url' ? '🌐' : '💬'} {ad.cta_value}
                </p>
                {isLive && boost && (
                  <div className="boost-status active" style={{ marginTop: 10 }}>
                    <span className="boost-status-icon">🚀</span>
                    <div>
                      <strong>Live</strong>
                      <span className="boost-expires">
                        Ends {new Date(boost.ends_at!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {' '}({Math.max(0, Math.ceil((new Date(boost.ends_at!).getTime() - Date.now()) / 86400000))} days left)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <button
        className="dash-logout-btn"
        onClick={async () => { await signOut(); navigate('/login', { replace: true }) }}
      >
        Log out
      </button>
    </div>
  )
}
