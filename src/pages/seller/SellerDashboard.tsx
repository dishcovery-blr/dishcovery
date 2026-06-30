import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase, signOut } from '../../lib/supabase'
import type { VendorAd } from '../../types/database'

const STORAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/seller-media`

interface ActiveVendorAd extends VendorAd {
  vendor_name: string
}

export default function SellerDashboard() {
  const { seller, loading } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ views: 0, taps: 0, menuItems: 0, avgRating: 0 })
  const [vendorListings, setVendorListings] = useState<ActiveVendorAd[]>([])
  const [vendorBanner, setVendorBanner] = useState<ActiveVendorAd | null>(null)
  const [vendorSplash, setVendorSplash] = useState<ActiveVendorAd | null>(null)
  const [splashDismissed, setSplashDismissed] = useState(
    !!sessionStorage.getItem('vendor_splash_shown')
  )

  useEffect(() => {
    if (seller) { loadStats(); loadVendorAds() }
  }, [seller?.id])

  async function loadStats() {
    if (!seller) return
    const [menuRes, reviewsRes] = await Promise.all([
      supabase.from('menu_items').select('id', { count: 'exact' }).eq('seller_id', seller.id),
      supabase.from('reviews').select('rating').eq('seller_id', seller.id),
    ])
    const ratings = reviewsRes.data ?? []
    const avg = ratings.length ? Math.round(ratings.reduce((s, r) => s + r.rating, 0) / ratings.length * 10) / 10 : 0
    setStats({
      views: seller.profile_views ?? 0,
      taps: seller.whatsapp_taps ?? 0,
      menuItems: menuRes.count ?? 0,
      avgRating: avg,
    })
  }

  async function loadVendorAds() {
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('vendor_ad_boosts')
      .select('*, vendor_ads(*, vendors(company_name))')
      .eq('payment_status', 'paid')
      .lte('starts_at', now)
      .gt('ends_at', now)
    if (!data) return
    const toAd = (b: any): ActiveVendorAd => ({
      ...b.vendor_ads,
      vendor_name: b.vendor_ads?.vendors?.company_name ?? '',
    })
    setVendorListings(data.filter((b: any) => b.vendor_ads?.ad_type === 'listing').map(toAd))
    const banners = data.filter((b: any) => b.vendor_ads?.ad_type === 'banner').map(toAd)
    if (banners.length) setVendorBanner(banners[Math.floor(Math.random() * banners.length)])
    const splashes = data.filter((b: any) => b.vendor_ads?.ad_type === 'splash').map(toAd)
    if (splashes.length && !sessionStorage.getItem('vendor_splash_shown')) {
      setVendorSplash(splashes[Math.floor(Math.random() * splashes.length)])
    }
  }

  function dismissSplash() {
    sessionStorage.setItem('vendor_splash_shown', '1')
    setSplashDismissed(true)
  }

  function handleVendorCta(ad: ActiveVendorAd) {
    if (ad.cta_type === 'whatsapp') {
      const num = ad.cta_value.replace(/\D/g, '')
      window.open(`https://wa.me/${num}`, '_blank')
    } else {
      window.open(ad.cta_value, '_blank')
    }
  }

  if (loading && !seller) return <div className="page-loading">Loading…</div>
  if (!seller) return <div className="page-loading">No seller profile found.</div>

  const subscriptionEnd = seller.subscription_end ? new Date(seller.subscription_end) : null
  const isExpired = subscriptionEnd ? subscriptionEnd < new Date() : true
  const daysLeft = subscriptionEnd ? Math.ceil((subscriptionEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0
  const isTrial = daysLeft > 0 && daysLeft <= 30

  return (
    <div className="dashboard-page">

      {/* Vendor splash — Tier 3 */}
      {vendorSplash && !splashDismissed && (
        <div className="splash-overlay" onClick={dismissSplash}>
          <div className="splash-card" onClick={e => e.stopPropagation()}>
            <button className="splash-close" onClick={dismissSplash}>✕</button>
            {vendorSplash.photo_url && (
              <img src={`${STORAGE_URL}/${vendorSplash.photo_url}`} alt={vendorSplash.title} className="splash-img" />
            )}
            <div className="splash-body">
              <p className="vendor-ad-sponsor">Sponsored · {vendorSplash.vendor_name}</p>
              <h2 className="splash-title">{vendorSplash.title}</h2>
              {vendorSplash.body && <p className="splash-text">{vendorSplash.body}</p>}
              <div className="splash-actions">
                <button className="splash-cta" onClick={() => { dismissSplash(); handleVendorCta(vendorSplash) }}>
                  {vendorSplash.cta_type === 'whatsapp' ? '💬 WhatsApp us' : '🌐 Visit website'}
                </button>
                <button className="splash-skip" onClick={dismissSplash}>Maybe later</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vendor floating banner — Tier 2 */}
      {vendorBanner && (
        <div className="vendor-banner" onClick={() => handleVendorCta(vendorBanner)}>
          {vendorBanner.photo_url && (
            <img src={`${STORAGE_URL}/${vendorBanner.photo_url}`} alt="" className="vendor-banner-img" />
          )}
          <div className="vendor-banner-content">
            <span className="vendor-banner-sponsor">Ad · {vendorBanner.vendor_name}</span>
            <span className="vendor-banner-title">{vendorBanner.title}</span>
          </div>
          <span className="vendor-banner-cta">{vendorBanner.cta_type === 'whatsapp' ? '💬' : '→'}</span>
        </div>
      )}

      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Welcome back, {seller.display_name}!</h1>
          <p className="dashboard-subtitle">Manage your Dishcovery listing</p>
        </div>
        <a href={`/seller/${seller.id}`} className="view-listing-btn" target="_blank" rel="noopener noreferrer">
          View listing ↗
        </a>
      </div>

      {seller.status === 'active_unverified' && (
  <div className="status-banner pending">
    ⏳ Your listing is not yet visible to customers. Our team is verifying your FSSAI registration. You can set up your profile, gallery and menu in the meantime.
  </div>
)}
{seller.status === 'pending' && (
  <div className="status-banner pending">⏳ Your profile is under review.</div>
)}
      {seller.status === 'rejected' && (
        <div className="status-banner rejected">✕ Your profile was not approved. Please update your details and resubmit.</div>
      )}
      {isExpired && (
        <div className="status-banner expired">⚠ Your subscription has expired. <button onClick={() => navigate('/seller/subscribe')}>Renew now</button></div>
      )}
      {!isExpired && isTrial && (
        <div className="status-banner trial">🎉 Free trial — {daysLeft} days remaining. <button onClick={() => navigate('/seller/subscribe')}>Subscribe</button></div>
      )}
      {seller.fssai_status === 'not_submitted' && (
        <div className="status-banner fssai">📋 Complete your FSSAI registration to get a verified badge. <button onClick={() => navigate('/seller/fssai')}>Learn how →</button></div>
      )}

      <div className="dashboard-stats">
        <div className="dash-stat">
          <span className="dash-stat-val">{stats.views}</span>
          <span className="dash-stat-label">Profile views</span>
        </div>
        <div className="dash-stat">
          <span className="dash-stat-val">{stats.taps}</span>
          <span className="dash-stat-label">WhatsApp taps</span>
        </div>
        <div className="dash-stat">
          <span className="dash-stat-val">{stats.menuItems}</span>
          <span className="dash-stat-label">Menu items</span>
        </div>
        <div className="dash-stat">
          <span className="dash-stat-val">{stats.avgRating > 0 ? stats.avgRating : '—'}</span>
          <span className="dash-stat-label">Avg rating</span>
        </div>
      </div>

      {/* Vendor Deals — Tier 1 */}
      <div className="vendor-deals-section">
        <div className="vendor-deals-header">
          <h2 className="section-title" style={{ margin: 0 }}>Vendor Deals</h2>
          <span className="vendor-deals-tag">For sellers</span>
        </div>
        {vendorListings.length === 0 ? (
          <div className="vendor-deals-empty">
            <span>🛒</span>
            <p>Deals from equipment and ingredient suppliers will appear here</p>
          </div>
        ) : (
          <div className="vendor-deals-scroll">
            {vendorListings.map(ad => (
              <div key={ad.id} className="vendor-deal-card" onClick={() => handleVendorCta(ad)}>
                {ad.photo_url && (
                  <img src={`${STORAGE_URL}/${ad.photo_url}`} alt={ad.title} className="vendor-deal-img" />
                )}
                <div className="vendor-deal-body">
                  <p className="vendor-deal-sponsor">Ad · {ad.vendor_name}</p>
                  <p className="vendor-deal-title">{ad.title}</p>
                  {ad.body && <p className="vendor-deal-desc">{ad.body}</p>}
                  <div className="vendor-deal-cta">
                    {ad.cta_type === 'whatsapp' ? '💬 WhatsApp' : '🌐 Visit site'} →
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <h2 className="section-title">Manage</h2>
      <div className="dashboard-actions">
        <button className="dash-action" onClick={() => navigate('/seller/profile')}>
          <span className="dash-action-icon">✏️</span>
          <span className="dash-action-label">Edit profile</span>
          <span className="dash-action-desc">Name, bio, location, tags</span>
        </button>
        <button className="dash-action" onClick={() => navigate('/seller/gallery')}>
          <span className="dash-action-icon">📸</span>
          <span className="dash-action-label">Gallery</span>
          <span className="dash-action-desc">Upload food photos</span>
        </button>
        <button className="dash-action" onClick={() => navigate('/seller/menu')}>
          <span className="dash-action-icon">📋</span>
          <span className="dash-action-label">Menu</span>
          <span className="dash-action-desc">Items, prices, categories</span>
        </button>
        <button className="dash-action" onClick={() => navigate('/seller/announcements')}>
          <span className="dash-action-icon">📣</span>
          <span className="dash-action-label">Announcements</span>
          <span className="dash-action-desc">Post offers and updates</span>
        </button>
        <button className="dash-action" onClick={() => navigate('/seller/reviews')}>
          <span className="dash-action-icon">⭐</span>
          <span className="dash-action-label">Reviews</span>
          <span className="dash-action-desc">View and reply to feedback</span>
        </button>
        <button className="dash-action" onClick={() => navigate('/seller/settings')}>
          <span className="dash-action-icon">⚙️</span>
          <span className="dash-action-label">Settings</span>
          <span className="dash-action-desc">Password, email, notifications</span>
        </button>
      </div>

      <button
        className="dash-logout-btn"
        onClick={async () => { await signOut(); navigate('/login', { replace: true }) }}
      >
        Log out
      </button>
    </div>
  )
}
