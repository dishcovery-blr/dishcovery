import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function SellerDashboard() {
  const { seller, loading } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ views: 0, taps: 0, menuItems: 0, activeOffers: 0 })

  useEffect(() => {
    if (seller) loadStats()
  }, [seller])

  async function loadStats() {
    if (!seller) return
    const [menuRes, offersRes] = await Promise.all([
      supabase.from('menu_items').select('id', { count: 'exact' }).eq('seller_id', seller.id),
      supabase.from('offers').select('id', { count: 'exact' }).eq('seller_id', seller.id).eq('is_active', true).gt('expires_at', new Date().toISOString()),
    ])
    setStats({
      views: seller.profile_views ?? 0,
      taps: seller.whatsapp_taps ?? 0,
      menuItems: menuRes.count ?? 0,
      activeOffers: offersRes.count ?? 0,
    })
  }

  if (loading) return <div className="page-loading">Loading…</div>
  if (!seller) return <div className="page-loading">No seller profile found.</div>

  const subscriptionEnd = seller.subscription_end ? new Date(seller.subscription_end) : null
  const isExpired = subscriptionEnd ? subscriptionEnd < new Date() : true
  const daysLeft = subscriptionEnd ? Math.ceil((subscriptionEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0
  const isTrial = daysLeft > 0 && daysLeft <= 30

  return (
    <div className="dashboard-page">
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
          <span className="dash-stat-val">{stats.activeOffers}</span>
          <span className="dash-stat-label">Active offers</span>
        </div>
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
        <button className="dash-action" onClick={() => navigate('/seller/offers')}>
          <span className="dash-action-icon">🏷</span>
          <span className="dash-action-label">Offers</span>
          <span className="dash-action-desc">Create limited-time deals</span>
        </button>
      </div>
    </div>
  )
}
