import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

interface PlatformStats {
  totalSellers: number
  activeSellers: number
  pendingSellers: number
  suspendedSellers: number
  totalConsumers: number
  totalReviews: number
  totalWhatsappTaps: number
  fssaiPending: number
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    const [sellers, consumers, reviews] = await Promise.all([
      supabase.from('sellers').select('status, fssai_status, whatsapp_taps'),
      supabase.from('consumers').select('id', { count: 'exact' }),
      supabase.from('reviews').select('id', { count: 'exact' }),
    ])

    const sellerData = sellers.data ?? []
    setStats({
      totalSellers: sellerData.length,
      activeSellers: sellerData.filter(s => s.status === 'approved').length,
      pendingSellers: sellerData.filter(s => s.status === 'active_unverified').length,
      suspendedSellers: sellerData.filter(s => s.status === 'suspended').length,
      totalConsumers: consumers.count ?? 0,
      totalReviews: reviews.count ?? 0,
      totalWhatsappTaps: sellerData.reduce((sum, s) => sum + (s.whatsapp_taps ?? 0), 0),
      fssaiPending: sellerData.filter(s => s.status === 'active_unverified').length,
    })
    setLoading(false)
  }

  if (loading) return <div className="page-loading">Loading…</div>

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Admin Dashboard</h1>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <span className="admin-stat-val">{stats?.totalSellers}</span>
          <span className="admin-stat-label">Total sellers</span>
        </div>
        <div className="admin-stat-card green">
          <span className="admin-stat-val">{stats?.activeSellers}</span>
          <span className="admin-stat-label">Active listings</span>
        </div>
        <div className="admin-stat-card amber">
          <span className="admin-stat-val">{stats?.pendingSellers}</span>
          <span className="admin-stat-label">Pending review</span>
        </div>
        <div className="admin-stat-card red">
          <span className="admin-stat-val">{stats?.suspendedSellers}</span>
          <span className="admin-stat-label">Suspended</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-val">{stats?.totalConsumers}</span>
          <span className="admin-stat-label">Consumers</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-val">{stats?.totalReviews}</span>
          <span className="admin-stat-label">Reviews</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-val">{stats?.totalWhatsappTaps}</span>
          <span className="admin-stat-label">WhatsApp taps</span>
        </div>
        <div className="admin-stat-card amber">
          <span className="admin-stat-val">{stats?.fssaiPending}</span>
          <span className="admin-stat-label">FSSAI to review</span>
        </div>
      </div>

      <h2 className="admin-section-title">Manage</h2>
      <div className="admin-nav-grid">
        <button className="admin-nav-card" onClick={() => navigate('/admin/sellers?filter=pending')}>
          <span className="admin-nav-icon">⏳</span>
          <strong>Pending approvals</strong>
          <span>{stats?.pendingSellers} awaiting FSSAI verification</span>
        </button>
        <button className="admin-nav-card" onClick={() => navigate('/admin/sellers')}>
          <span className="admin-nav-icon">🏪</span>
          <strong>All sellers</strong>
          <span>Manage listings & subscriptions</span>
        </button>
        <button className="admin-nav-card" onClick={() => navigate('/admin/fssai')}>
          <span className="admin-nav-icon">📋</span>
          <strong>FSSAI review</strong>
          <span>{stats?.fssaiPending} documents pending</span>
        </button>
        <button className="admin-nav-card" onClick={() => navigate('/admin/consumers')}>
          <span className="admin-nav-icon">👥</span>
          <strong>Consumers</strong>
          <span>View & manage accounts</span>
        </button>
      </div>
    </div>
  )
}
