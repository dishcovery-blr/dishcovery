import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Seller, Subscription } from '../../types/database'

type SellerWithSub = Seller & { subscriptions: Subscription[] }
type StatusFilter = 'all' | 'pending' | 'approved' | 'suspended' | 'rejected'

export default function AdminSellers() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [sellers, setSellers] = useState<SellerWithSub[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const filter = (searchParams.get('filter') ?? 'all') as StatusFilter

  useEffect(() => { loadSellers() }, [filter])

  async function loadSellers() {
    setLoading(true)
    let query = supabase
      .from('sellers')
      .select('*, subscriptions(*)')
      .order('created_at', { ascending: false })

    if (filter !== 'all') query = query.eq('status', filter)

    const { data } = await query
    setSellers(data ?? [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    const target = sellers.find(s => s.id === id)
    const updates: Record<string, unknown> = { status }

    // First-time approval: start the 14-day free trial
    if (status === 'approved' && target && !target.subscription_end) {
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + 14)
      updates.subscription_end = trialEnd.toISOString()
    }

    await supabase.from('sellers').update(updates).eq('id', id)
    setSellers(sellers.map(s => s.id === id ? { ...s, ...updates as any } : s))
    await supabase.from('admin_logs').insert({ action: `status_${status}`, target_id: id, target_type: 'seller' })
  }

  async function toggleFeatured(seller: SellerWithSub) {
    await supabase.from('sellers').update({ is_featured: !seller.is_featured }).eq('id', seller.id)
    setSellers(sellers.map(s => s.id === seller.id ? { ...s, is_featured: !s.is_featured } : s))
  }

  async function extendSubscription(sellerId: string, days: number) {
    const seller = sellers.find(s => s.id === sellerId)
    if (!seller) return

    const currentEnd = seller.subscription_end ? new Date(seller.subscription_end) : new Date()
    const base = currentEnd > new Date() ? currentEnd : new Date()
    const newEnd = new Date(base.getTime() + days * 24 * 60 * 60 * 1000)

    await supabase.from('sellers').update({
      subscription_end: newEnd.toISOString(),
      status: 'approved',
    }).eq('id', sellerId)

    await supabase.from('subscriptions').insert({
      seller_id: sellerId,
      plan_tier: 'standard',
      status: 'active',
      starts_at: new Date().toISOString(),
      ends_at: newEnd.toISOString(),
    })

    await supabase.from('admin_logs').insert({
      action: 'extended_subscription',
      target_id: sellerId,
      target_type: 'seller',
      notes: `Extended by ${days} days until ${newEnd.toLocaleDateString('en-IN')}`,
    })

    setSellers(sellers.map(s => s.id === sellerId ? { ...s, subscription_end: newEnd.toISOString(), status: 'approved' as any } : s))
  }

  const filtered = search
    ? sellers.filter(s => s.display_name.toLowerCase().includes(search.toLowerCase()) || s.location_text?.toLowerCase().includes(search.toLowerCase()))
    : sellers

  function subStatus(seller: SellerWithSub) {
    if (!seller.subscription_end) return { label: 'No subscription', color: '#888' }
    const end = new Date(seller.subscription_end)
    const daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysLeft < 0) return { label: `Expired ${Math.abs(daysLeft)}d ago`, color: '#A32D2D' }
    if (daysLeft <= 7) return { label: `${daysLeft}d left`, color: '#854F0B' }
    return { label: `${daysLeft}d left`, color: '#3B6D11' }
  }

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Sellers</h1>

      <div className="admin-toolbar">
        <div className="admin-filter-tabs">
          {(['all', 'pending', 'approved', 'suspended', 'rejected'] as StatusFilter[]).map(f => (
            <button
              key={f}
              className={`admin-filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setSearchParams({ filter: f })}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <input
          className="admin-search"
          type="text"
          placeholder="Search by name or area…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">No sellers found.</div>
      ) : (
        <div className="admin-seller-list">
          {filtered.map(seller => {
            const sub = subStatus(seller)
            return (
              <div key={seller.id} className="admin-seller-card">
                <div className="admin-seller-top">
                  <div>
                    <div className="admin-seller-name">
                      {seller.display_name}
                      {seller.is_featured && <span className="featured-pill">⭐ Featured</span>}
                    </div>
                    <div className="admin-seller-meta">
                      <span className={`admin-status-pill ${seller.status}`}>{seller.status}</span>
                      <span className="admin-seller-type">{seller.seller_type.replace('_', ' ')}</span>
                      <span>📍 {seller.location_text}</span>
                      <span>📱 {seller.whatsapp_number}</span>
                    </div>
                    <div className="admin-seller-fssai">
                      FSSAI: <span className={`fssai-pill ${seller.fssai_status}`}>{seller.fssai_status.replace('_', ' ')}</span>
                      {seller.fssai_number && <span> · {seller.fssai_number}</span>}
                    </div>
                  </div>
                  <div className="admin-seller-sub">
                    <span style={{ color: sub.color, fontWeight: 600, fontSize: 13 }}>{sub.label}</span>
                    <span style={{ fontSize: 11, color: '#888' }}>subscription</span>
                  </div>
                </div>

                <div className="admin-seller-actions">
                  {/* Status controls */}
                  {seller.status === 'pending' && (
                    <>
                      <button className="admin-btn green" onClick={() => updateStatus(seller.id, 'approved')}>Approve</button>
                      <button className="admin-btn red" onClick={() => updateStatus(seller.id, 'rejected')}>Reject</button>
                    </>
                  )}
                  {seller.status === 'approved' && (
                    <button className="admin-btn red-outline" onClick={() => updateStatus(seller.id, 'suspended')}>Suspend</button>
                  )}
                  {seller.status === 'suspended' && (
                    <button className="admin-btn green" onClick={() => updateStatus(seller.id, 'approved')}>Reinstate</button>
                  )}
                  {seller.status === 'rejected' && (
                    <button className="admin-btn green" onClick={() => updateStatus(seller.id, 'approved')}>Approve</button>
                  )}

                  {/* Subscription extension */}
                  <div className="admin-extend-group">
                    <span className="admin-extend-label">Extend:</span>
                    <button className="admin-btn outline" onClick={() => extendSubscription(seller.id, 30)}>+30d</button>
                    <button className="admin-btn outline" onClick={() => extendSubscription(seller.id, 90)}>+90d</button>
                    <button className="admin-btn outline" onClick={() => extendSubscription(seller.id, 365)}>+1yr</button>
                  </div>

                  {/* Featured toggle */}
                  <button
                    className={`admin-btn ${seller.is_featured ? 'amber' : 'outline'}`}
                    onClick={() => toggleFeatured(seller)}
                  >
                    {seller.is_featured ? '⭐ Featured' : 'Set featured'}
                  </button>

                  {/* View listing */}
                  <a className="admin-btn outline" href={`/seller/${seller.id}`} target="_blank" rel="noopener noreferrer">
                    View ↗
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
