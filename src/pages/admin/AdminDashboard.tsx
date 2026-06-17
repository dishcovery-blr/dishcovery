import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

interface Stats {
  totalSellers: number
  liveSellers: number
  pendingSellers: number
  suspendedSellers: number
  totalConsumers: number
  totalUsers: number
  totalWhatsappTaps: number
  totalReviews: number
  avgRating: number
  topSellers: { id: string; display_name: string; whatsapp_taps: number; location_text: string }[]
  topRated: { id: string; display_name: string; avg_rating: number; review_count: number }[]
  lowRated: { id: string; display_name: string; avg_rating: number; review_count: number }[]
  recentReviews: { id: string; body: string; rating: number; created_at: string; sellers: { display_name: string } | null }[]
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const [sellersRes, consumersRes, reviewsRes] = await Promise.all([
      supabase.from('sellers').select('id, display_name, status, whatsapp_taps, location_text, profile_views'),
      supabase.from('consumers').select('id', { count: 'exact' }),
      supabase.from('reviews').select('id, body, rating, created_at, seller_id, sellers(display_name)'),
    ])

    const sellers = sellersRes.data ?? []
    const consumers = consumersRes.count ?? 0
    const reviews = reviewsRes.data ?? []

    // WhatsApp top sellers
    const topSellers = [...sellers]
      .sort((a, b) => (b.whatsapp_taps ?? 0) - (a.whatsapp_taps ?? 0))
      .slice(0, 5)
      .map(s => ({ id: s.id, display_name: s.display_name, whatsapp_taps: s.whatsapp_taps ?? 0, location_text: s.location_text ?? '' }))

    // Ratings by seller
    const ratingMap: Record<string, { name: string; sum: number; count: number; id: string }> = {}
    reviews.forEach((r: any) => {
      if (!ratingMap[r.seller_id]) {
        ratingMap[r.seller_id] = { id: r.seller_id, name: r.sellers?.display_name ?? '—', sum: 0, count: 0 }
      }
      ratingMap[r.seller_id].sum += r.rating
      ratingMap[r.seller_id].count += 1
    })

    const ratingList = Object.values(ratingMap)
      .filter(r => r.count >= 1)
      .map(r => ({ id: r.id, display_name: r.name, avg_rating: Math.round((r.sum / r.count) * 10) / 10, review_count: r.count }))

    const topRated = [...ratingList].sort((a, b) => b.avg_rating - a.avg_rating).slice(0, 5)
    const lowRated = [...ratingList].sort((a, b) => a.avg_rating - b.avg_rating).slice(0, 5)

    const totalRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0)
    const avgRating = reviews.length > 0 ? Math.round((totalRating / reviews.length) * 10) / 10 : 0

    const recentReviews = [...reviews]
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((r: any) => ({ id: r.id, body: r.body, rating: r.rating, created_at: r.created_at, sellers: r.sellers }))

    setStats({
      totalSellers: sellers.length,
      liveSellers: sellers.filter(s => s.status === 'approved').length,
      pendingSellers: sellers.filter(s => s.status === 'active_unverified').length,
      suspendedSellers: sellers.filter(s => s.status === 'suspended').length,
      totalConsumers: consumers,
      totalUsers: sellers.length + consumers,
      totalWhatsappTaps: sellers.reduce((sum, s) => sum + (s.whatsapp_taps ?? 0), 0),
      totalReviews: reviews.length,
      avgRating,
      topSellers,
      topRated,
      lowRated,
      recentReviews,
    })
    setLoading(false)
  }

  function stars(n: number) { return '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n)) }

  if (loading) return <div className="page-loading">Loading…</div>
  if (!stats) return null

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Admin Dashboard</h1>

      {/* User stats */}
      <h2 className="admin-section-title">Users</h2>
      <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="admin-stat-card">
          <span className="admin-stat-val">{stats.totalUsers}</span>
          <span className="admin-stat-label">Total users</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-val">{stats.totalSellers}</span>
          <span className="admin-stat-label">Sellers</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-val">{stats.totalConsumers}</span>
          <span className="admin-stat-label">Consumers</span>
        </div>
      </div>

      {/* Seller stats */}
      <h2 className="admin-section-title">Listings</h2>
      <div className="admin-stats-grid">
        <div className="admin-stat-card green">
          <span className="admin-stat-val">{stats.liveSellers}</span>
          <span className="admin-stat-label">Live</span>
        </div>
        <div className="admin-stat-card amber">
          <span className="admin-stat-val">{stats.pendingSellers}</span>
          <span className="admin-stat-label">Awaiting activation</span>
        </div>
        <div className="admin-stat-card red">
          <span className="admin-stat-val">{stats.suspendedSellers}</span>
          <span className="admin-stat-label">Suspended</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-val">{stats.totalWhatsappTaps}</span>
          <span className="admin-stat-label">WhatsApp taps</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-val">{stats.totalReviews}</span>
          <span className="admin-stat-label">Reviews</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-val">{stats.avgRating > 0 ? stats.avgRating : '—'}</span>
          <span className="admin-stat-label">Avg rating</span>
        </div>
      </div>

      {/* Manage */}
      <h2 className="admin-section-title">Manage</h2>
      <div className="admin-nav-grid">
        <button className="admin-nav-card" onClick={() => navigate('/admin/fssai')}>
          <span className="admin-nav-icon">⏳</span>
          <strong>Pending activation</strong>
          <span>{stats.pendingSellers} awaiting FSSAI verification</span>
        </button>
        <button className="admin-nav-card" onClick={() => navigate('/admin/sellers')}>
          <span className="admin-nav-icon">🏪</span>
          <strong>All sellers</strong>
          <span>Manage listings and subscriptions</span>
        </button>
        <button className="admin-nav-card" onClick={() => navigate('/admin/consumers')}>
          <span className="admin-nav-icon">👥</span>
          <strong>Consumers</strong>
          <span>View and manage accounts</span>
        </button>
      </div>

      {/* WhatsApp activity */}
      {stats.topSellers.length > 0 && (
        <>
          <h2 className="admin-section-title">Most WhatsApp taps</h2>
          <div className="admin-ranking-list">
            {stats.topSellers.map((s, i) => (
              <div key={s.id} className="admin-ranking-row">
                <span className="admin-rank">#{i + 1}</span>
                <div className="admin-ranking-info">
                  <span className="admin-ranking-name">{s.display_name}</span>
                  <span className="admin-ranking-meta">{s.location_text}</span>
                </div>
                <span className="admin-ranking-val">{s.whatsapp_taps} taps</span>
                <a className="admin-btn outline" href={`/seller/${s.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, padding: '4px 10px' }}>View</a>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Top rated */}
      {stats.topRated.length > 0 && (
        <>
          <h2 className="admin-section-title">Top rated sellers</h2>
          <div className="admin-ranking-list">
            {stats.topRated.map((s, i) => (
              <div key={s.id} className="admin-ranking-row">
                <span className="admin-rank">#{i + 1}</span>
                <div className="admin-ranking-info">
                  <span className="admin-ranking-name">{s.display_name}</span>
                  <span className="admin-ranking-meta">{s.review_count} review{s.review_count !== 1 ? 's' : ''}</span>
                </div>
                <span className="admin-ranking-val" style={{ color: '#BA7517' }}>{stars(s.avg_rating)} {s.avg_rating}</span>
                <a className="admin-btn outline" href={`/seller/${s.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, padding: '4px 10px' }}>View</a>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Low rated */}
      {stats.lowRated.length > 0 && (
        <>
          <h2 className="admin-section-title">Needs attention — low rated</h2>
          <div className="admin-ranking-list">
            {stats.lowRated.map((s, i) => (
              <div key={s.id} className="admin-ranking-row">
                <span className="admin-rank">#{i + 1}</span>
                <div className="admin-ranking-info">
                  <span className="admin-ranking-name">{s.display_name}</span>
                  <span className="admin-ranking-meta">{s.review_count} review{s.review_count !== 1 ? 's' : ''}</span>
                </div>
                <span className="admin-ranking-val" style={{ color: '#A32D2D' }}>{stars(s.avg_rating)} {s.avg_rating}</span>
                <a className="admin-btn outline" href={`/seller/${s.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, padding: '4px 10px' }}>View</a>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Recent reviews */}
      {stats.recentReviews.length > 0 && (
        <>
          <h2 className="admin-section-title">Recent reviews</h2>
          <div className="admin-ranking-list">
            {stats.recentReviews.map(r => (
              <div key={r.id} className="admin-ranking-row" style={{ flexWrap: 'wrap', gap: 6 }}>
                <div className="admin-ranking-info" style={{ flex: 1 }}>
                  <span className="admin-ranking-name">{r.sellers?.display_name ?? '—'}</span>
                  {r.body && <span className="admin-ranking-meta">"{r.body}"</span>}
                </div>
                <span style={{ color: '#BA7517', fontSize: 13 }}>{stars(r.rating)} {r.rating}</span>
                <span style={{ fontSize: 11, color: '#888' }}>{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
