import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase, createBoostOrder } from '../../lib/supabase'
import type { Offer, OfferBoost } from '../../types/database'

type OfferWithBoosts = Offer & { offer_boosts: OfferBoost[] }
type FormTier = 'tier1' | 'browse_banner' | 'splash'

const BOOST_PRICES: Record<string, number> = {
  browse_banner: 500,
  splash: 1000,
}

const FAR_FUTURE = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 10)
  return d.toISOString()
}

const STORAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/seller-media`

function BrowseBannerPreview({ title, imageUrl, sellerName, avatarUrl }: {
  title: string; imageUrl: string | null; sellerName: string; avatarUrl: string | null
}) {
  return (
    <div className="preview-wrap">
      <p className="preview-label">Preview · Browse Banner</p>
      <div className="preview-browse-banner">
        {imageUrl
          ? <img src={imageUrl} alt="" className="preview-banner-img" />
          : <div className="preview-banner-placeholder" />
        }
        <div className="preview-banner-logo">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{sellerName.charAt(0).toUpperCase()}</span>}
        </div>
        <div className="preview-banner-content">
          <span className="preview-banner-seller">{sellerName}</span>
          <span className="preview-banner-title">{title || 'Your offer title here'}</span>
        </div>
      </div>
    </div>
  )
}

function SplashPreview({ title, body, imageUrl, sellerName, avatarUrl }: {
  title: string; body: string; imageUrl: string | null; sellerName: string; avatarUrl: string | null
}) {
  return (
    <div className="preview-wrap">
      <p className="preview-label">Preview · Splash Screen</p>
      <div className="preview-splash-card">
        {imageUrl
          ? <img src={imageUrl} alt="" className="preview-splash-img" />
          : <div className="preview-splash-placeholder" />
        }
        <div className="preview-splash-body">
          <div className="splash-header-row">
            <div className="splash-logo">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{sellerName.charAt(0).toUpperCase()}</span>}
            </div>
            <p className="splash-seller">{sellerName}</p>
          </div>
          <h2 className="splash-title" style={{ fontSize: 16, margin: '6px 0 4px' }}>{title || 'Your offer title here'}</h2>
          {body && <p className="splash-text" style={{ fontSize: 12 }}>{body}</p>}
          <div className="splash-actions" style={{ marginTop: 12 }}>
            <button className="splash-cta" style={{ padding: '8px', fontSize: 13 }}>View offer</button>
            <button className="splash-skip" style={{ padding: '8px', fontSize: 13 }}>Maybe later</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SellerAnnouncements() {
  const { seller } = useAuth()
  const navigate = useNavigate()
  const [announcements, setAnnouncements] = useState<OfferWithBoosts[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', expires_at: '', noExpiry: false })
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [posterPreview, setPosterPreview] = useState<string | null>(null)
  const [formTier, setFormTier] = useState<FormTier>('tier1')
  const [formDays, setFormDays] = useState(1)

  const [showBoostFor, setShowBoostFor] = useState<string | null>(null)
  const [boostForm, setBoostForm] = useState<{ type: 'browse_banner' | 'splash'; days: number }>({ type: 'browse_banner', days: 1 })
  const [requestingBoost, setRequestingBoost] = useState(false)

  useEffect(() => { if (seller) load() }, [seller])

  async function load() {
    if (!seller) return
    const { data } = await supabase
      .from('offers')
      .select('*, offer_boosts(*)')
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: false })
    setAnnouncements((data ?? []) as OfferWithBoosts[])
  }

  function handlePoster(file: File) {
    setPosterFile(file)
    setPosterPreview(URL.createObjectURL(file))
  }

  function openForm() {
    setForm({ title: '', body: '', expires_at: defaultExpiry(), noExpiry: false })
    setPosterFile(null)
    setPosterPreview(null)
    setFormTier('tier1')
    setFormDays(1)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setPosterFile(null)
    setPosterPreview(null)
  }

  async function create() {
    if (!seller || !form.title) return
    const isBoost = formTier !== 'tier1'
    if (!isBoost && !form.noExpiry && !form.expires_at) return
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

    const expires_at = (form.noExpiry || isBoost) ? FAR_FUTURE() : new Date(form.expires_at).toISOString()
    const { data } = await supabase
      .from('offers')
      .insert({ seller_id: seller.id, title: form.title, body: form.body || null, expires_at, is_active: true, photo_urls })
      .select('*, offer_boosts(*)')
      .single()

    if (data) {
      let withBoosts = data as OfferWithBoosts
      if (isBoost) {
        const amountPaise = formDays * BOOST_PRICES[formTier] * 100
        const { data: boostData } = await createBoostOrder({
          offerId: data.id,
          sellerId: seller.id,
          boostType: formTier as 'browse_banner' | 'splash',
          daysPurchased: formDays,
          amountPaise,
        })
        if (boostData) withBoosts = { ...data, offer_boosts: [boostData as OfferBoost] } as OfferWithBoosts
      }
      setAnnouncements([withBoosts, ...announcements])
    }

    closeForm()
    setSaving(false)
  }

  async function remove(id: string) {
    await supabase.from('offers').delete().eq('id', id)
    setAnnouncements(announcements.filter(a => a.id !== id))
  }

  async function requestBoost(offerId: string) {
    if (!seller) return
    setRequestingBoost(true)
    const amountPaise = boostForm.days * BOOST_PRICES[boostForm.type] * 100
    const { data, error } = await createBoostOrder({
      offerId,
      sellerId: seller.id,
      boostType: boostForm.type,
      daysPurchased: boostForm.days,
      amountPaise,
    })
    if (!error && data) {
      setAnnouncements(prev => prev.map(a =>
        a.id === offerId ? { ...a, offer_boosts: [...(a.offer_boosts ?? []), data as OfferBoost] } : a
      ))
      setShowBoostFor(null)
    }
    setRequestingBoost(false)
  }

  function activeBoost(a: OfferWithBoosts): OfferBoost | undefined {
    return (a.offer_boosts ?? [])
      .filter(b => b.payment_status !== 'cancelled')
      .sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime())[0]
  }

  function offerStatus(a: OfferWithBoosts) {
    if (!a.is_active) return 'inactive'
    const isPermanent = new Date(a.expires_at).getFullYear() > new Date().getFullYear() + 5
    if (isPermanent) return 'permanent'
    if (new Date(a.expires_at) < new Date()) return 'expired'
    return 'active'
  }

  function defaultExpiry() {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 16)
  }

  function getUrl(path: string) {
    return `${STORAGE_URL}/${path}`
  }

  const avatarUrl = seller?.avatar_url ? getUrl(seller.avatar_url) : null
  const boostTotal = boostForm.days * BOOST_PRICES[boostForm.type]
  const formTotal = formDays * (formTier !== 'tier1' ? BOOST_PRICES[formTier] : 0)

  return (
    <div className="editor-page">
      <div className="editor-header">
        <button className="back-btn" onClick={() => navigate('/seller/dashboard')}>← Back</button>
        <h1>Announcements</h1>
        <button className="save-btn" onClick={openForm}>+ New</button>
      </div>

      <div className="editor-form">

        {showForm && (
          <div className="offer-form">
            <h2>New announcement</h2>

            {/* Tier selector */}
            <div className="form-group">
              <label>Visibility tier</label>
              <div className="tier-selector">
                <button
                  className={`tier-card ${formTier === 'tier1' ? 'selected' : ''}`}
                  onClick={() => setFormTier('tier1')}
                >
                  <span className="tier-card-badge">Tier 1</span>
                  <span className="tier-card-name">Profile Banner</span>
                  <span className="tier-card-price tier-free">Free</span>
                  <span className="tier-card-desc">Permanent banner on your seller page</span>
                </button>
                <button
                  className={`tier-card ${formTier === 'browse_banner' ? 'selected' : ''}`}
                  onClick={() => setFormTier('browse_banner')}
                >
                  <span className="tier-card-badge">Tier 2</span>
                  <span className="tier-card-name">Browse Banner</span>
                  <span className="tier-card-price">₹500/day</span>
                  <span className="tier-card-desc">Rotating banner on the browse page</span>
                </button>
                <button
                  className={`tier-card ${formTier === 'splash' ? 'selected' : ''}`}
                  onClick={() => setFormTier('splash')}
                >
                  <span className="tier-card-badge">Tier 3</span>
                  <span className="tier-card-name">Splash Screen</span>
                  <span className="tier-card-price">₹1,000/day</span>
                  <span className="tier-card-desc">Full-screen when consumers open the app</span>
                </button>
              </div>
            </div>

            {/* Image */}
            <div className="form-group">
              <label>Image {formTier !== 'tier1' ? '*' : '(optional)'}</label>
              <label className="offer-poster-upload">
                {posterPreview
                  ? <img src={posterPreview} alt="Preview" className="offer-poster-preview" />
                  : <div className="offer-poster-placeholder"><span>📷</span><span>Upload a poster or banner image</span></div>
                }
                <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && handlePoster(e.target.files[0])} />
              </label>
              {posterPreview && <button className="remove-poster-btn" onClick={() => { setPosterFile(null); setPosterPreview(null) }}>Remove image</button>}
            </div>

            <div className="form-group">
              <label>Title *</label>
              <input type="text" placeholder="e.g. 20% off all cakes this weekend!" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
            </div>

            <div className="form-group">
              <label>Details (optional)</label>
              <textarea rows={3} placeholder="Any additional details…" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
            </div>

            {/* Expiry — only for Tier 1 */}
            {formTier === 'tier1' && (
              <>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={form.noExpiry} onChange={e => setForm({ ...form, noExpiry: e.target.checked })} />
                    <span><strong>No expiry</strong> — stays on your profile until you delete it</span>
                  </label>
                </div>
                {!form.noExpiry && (
                  <div className="form-group">
                    <label>Expires at</label>
                    <input type="datetime-local" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} min={new Date().toISOString().slice(0, 16)} />
                  </div>
                )}
              </>
            )}

            {/* Days + total — for Tier 2/3 */}
            {formTier !== 'tier1' && (
              <div className="form-group">
                <label>Number of days</label>
                <div className="boost-days-row">
                  <input
                    type="number" min={1} max={30}
                    value={formDays}
                    onChange={e => setFormDays(Math.max(1, Math.min(30, Number(e.target.value))))}
                  />
                  <span className="boost-total">Total: ₹{formTotal.toLocaleString('en-IN')}</span>
                </div>
                <p className="form-help">Pay via UPI to dishcovery.blr@gmail.com after publishing — we'll activate within 24 hours.</p>
              </div>
            )}

            {/* Live preview — for Tier 2/3 */}
            {formTier === 'browse_banner' && (
              <BrowseBannerPreview
                title={form.title}
                imageUrl={posterPreview}
                sellerName={seller?.display_name ?? ''}
                avatarUrl={avatarUrl}
              />
            )}
            {formTier === 'splash' && (
              <SplashPreview
                title={form.title}
                body={form.body}
                imageUrl={posterPreview}
                sellerName={seller?.display_name ?? ''}
                avatarUrl={avatarUrl}
              />
            )}

            <div className="form-actions">
              <button onClick={closeForm}>Cancel</button>
              <button
                className="btn-primary-sm"
                onClick={create}
                disabled={saving || uploading || !form.title || (formTier === 'tier1' && !form.noExpiry && !form.expires_at)}
              >
                {uploading ? 'Uploading…' : saving ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </div>
        )}

        {announcements.length === 0 && !showForm ? (
          <div className="offers-empty"><p>No announcements yet. Create one to keep customers informed!</p></div>
        ) : (
          <div className="offers-list">
            {announcements.map(a => {
              const s = offerStatus(a)
              const boost = activeBoost(a)
              const isBoostActive = boost?.payment_status === 'paid' && boost.ends_at && new Date(boost.ends_at) > new Date()
              const isBoostPending = boost?.payment_status === 'pending'

              return (
                <div key={a.id} className={`offer-card ${s}`}>
                  {a.photo_urls?.[0] && <img src={getUrl(a.photo_urls[0])} alt={a.title} className="offer-card-poster" />}
                  <div className="offer-card-header">
                    <span className={`offer-status-badge ${s}`}>
                      {s === 'permanent' ? '● Live' : s === 'active' ? '● Live' : '✕ Expired'}
                    </span>
                    <button className="delete-offer-btn" onClick={() => remove(a.id)}>Delete</button>
                  </div>
                  <h3 className="offer-card-title">{a.title}</h3>
                  {a.body && <p className="offer-card-body">{a.body}</p>}
                  <div className="offer-card-expiry">
                    {s === 'permanent' ? 'Permanent — remove manually'
                      : `${s === 'active' ? 'Expires' : 'Expired'} ${new Date(a.expires_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                  </div>

                  {/* Boost section */}
                  {(s === 'active' || s === 'permanent') && (
                    <div className="boost-section">
                      {isBoostActive && (
                        <div className="boost-status active">
                          <span className="boost-status-icon">🚀</span>
                          <div>
                            <strong>{boost.boost_type === 'browse_banner' ? 'Browse Banner' : 'Splash Screen'} · Live</strong>
                            <span className="boost-expires">
                              Ends {new Date(boost.ends_at!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              {' '}({Math.max(0, Math.ceil((new Date(boost.ends_at!).getTime() - Date.now()) / 86400000))} days left)
                            </span>
                          </div>
                        </div>
                      )}

                      {isBoostPending && (
                        <div className="boost-status pending">
                          <span className="boost-status-icon">⏳</span>
                          <div>
                            <strong>{boost.boost_type === 'browse_banner' ? 'Browse Banner' : 'Splash Screen'} · Awaiting payment</strong>
                            <div className="boost-payment-info">
                              <p>Pay <strong>₹{(boost.amount_paise / 100).toLocaleString('en-IN')}</strong> to UPI: <strong>dishcovery.blr@gmail.com</strong></p>
                              <p>Reference: <code className="boost-ref">BOOST-{boost.id.slice(0, 8).toUpperCase()}</code></p>
                              <p className="boost-hint">We'll activate within 24 hours of payment.</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {!isBoostActive && !isBoostPending && (
                        showBoostFor === a.id ? (
                          <div className="boost-form">
                            <p className="boost-form-title">Boost this announcement</p>
                            <div className="boost-type-btns">
                              <button
                                className={`boost-type-btn ${boostForm.type === 'browse_banner' ? 'selected' : ''}`}
                                onClick={() => setBoostForm({ ...boostForm, type: 'browse_banner' })}
                              >
                                <span className="boost-type-name">Browse Banner</span>
                                <span className="boost-type-price">₹500/day</span>
                                <span className="boost-type-desc">Rotating banner at top of browse page</span>
                              </button>
                              <button
                                className={`boost-type-btn ${boostForm.type === 'splash' ? 'selected' : ''}`}
                                onClick={() => setBoostForm({ ...boostForm, type: 'splash' })}
                              >
                                <span className="boost-type-name">Splash Screen</span>
                                <span className="boost-type-price">₹1,000/day</span>
                                <span className="boost-type-desc">Full-screen when consumers open the app</span>
                              </button>
                            </div>
                            <div className="boost-days-row">
                              <label>Days</label>
                              <input
                                type="number" min={1} max={30}
                                value={boostForm.days}
                                onChange={e => setBoostForm({ ...boostForm, days: Math.max(1, Math.min(30, Number(e.target.value))) })}
                              />
                              <span className="boost-total">Total: ₹{boostTotal.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="boost-form-actions">
                              <button onClick={() => setShowBoostFor(null)}>Cancel</button>
                              <button className="btn-primary-sm" onClick={() => requestBoost(a.id)} disabled={requestingBoost}>
                                {requestingBoost ? 'Requesting…' : 'Request boost'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button className="boost-cta-btn" onClick={() => { setShowBoostFor(a.id); setBoostForm({ type: 'browse_banner', days: 1 }) }}>
                            🚀 Boost this announcement
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
