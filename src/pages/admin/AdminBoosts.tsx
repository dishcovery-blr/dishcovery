import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

type BoostStatus = 'pending' | 'active' | 'all'

interface BoostRow {
  id: string
  boost_type: 'browse_banner' | 'splash'
  days_purchased: number
  amount_paise: number
  payment_status: string
  starts_at: string | null
  ends_at: string | null
  created_at: string
  offers: { title: string } | null
  sellers: { display_name: string } | null
}

export default function AdminBoosts() {
  const navigate = useNavigate()
  const [boosts, setBoosts] = useState<BoostRow[]>([])
  const [filter, setFilter] = useState<BoostStatus>('pending')
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('offer_boosts')
      .select('id, boost_type, days_purchased, amount_paise, payment_status, starts_at, ends_at, created_at, offers(title), sellers(display_name)')
      .order('created_at', { ascending: false })
    setBoosts((data ?? []) as BoostRow[])
    setLoading(false)
  }

  async function activate(boost: BoostRow) {
    setActivating(boost.id)
    const startsAt = new Date()
    const endsAt = new Date(startsAt.getTime() + boost.days_purchased * 86400000)
    await supabase
      .from('offer_boosts')
      .update({ payment_status: 'paid', starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() })
      .eq('id', boost.id)
    setBoosts(prev => prev.map(b => b.id === boost.id
      ? { ...b, payment_status: 'paid', starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() }
      : b
    ))
    setActivating(null)
  }

  async function cancel(id: string) {
    await supabase.from('offer_boosts').update({ payment_status: 'cancelled' }).eq('id', id)
    setBoosts(prev => prev.map(b => b.id === id ? { ...b, payment_status: 'cancelled' } : b))
  }

  const now = new Date()

  const filtered = boosts.filter(b => {
    if (filter === 'pending') return b.payment_status === 'pending'
    if (filter === 'active') return b.payment_status === 'paid' && b.ends_at && new Date(b.ends_at) > now
    return true
  })

  const pendingCount = boosts.filter(b => b.payment_status === 'pending').length

  function daysLeft(b: BoostRow) {
    if (!b.ends_at) return null
    return Math.max(0, Math.ceil((new Date(b.ends_at).getTime() - now.getTime()) / 86400000))
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="back-btn" onClick={() => navigate('/admin')}>← Back</button>
        <h1>Boosts</h1>
      </div>

      <div className="admin-filter-tabs">
        {(['pending', 'active', 'all'] as BoostStatus[]).map(f => (
          <button
            key={f}
            className={`admin-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'pending' && pendingCount > 0 && <span className="admin-tab-badge">{pendingCount}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">No {filter} boosts.</div>
      ) : (
        <div className="boost-admin-list">
          {filtered.map(b => (
            <div key={b.id} className={`boost-admin-row ${b.payment_status}`}>
              <div className="boost-admin-meta">
                <span className={`boost-type-badge ${b.boost_type}`}>
                  {b.boost_type === 'browse_banner' ? 'Browse Banner' : 'Splash Screen'}
                </span>
                <span className={`boost-admin-status ${b.payment_status}`}>{b.payment_status}</span>
              </div>

              <p className="boost-admin-seller">{b.sellers?.display_name ?? '—'}</p>
              <p className="boost-admin-offer">"{b.offers?.title ?? '—'}"</p>

              <div className="boost-admin-details">
                <span>{b.days_purchased} day{b.days_purchased !== 1 ? 's' : ''}</span>
                <span>₹{(b.amount_paise / 100).toLocaleString('en-IN')}</span>
                {b.payment_status === 'pending' && (
                  <span className="boost-ref-small">Ref: BOOST-{b.id.slice(0, 8).toUpperCase()}</span>
                )}
                {b.payment_status === 'paid' && b.ends_at && (
                  <span>{daysLeft(b)} days left · ends {new Date(b.ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                )}
              </div>

              <div className="boost-admin-actions">
                {b.payment_status === 'pending' && (
                  <button
                    className="btn-primary-sm"
                    onClick={() => activate(b)}
                    disabled={activating === b.id}
                  >
                    {activating === b.id ? 'Activating…' : 'Activate'}
                  </button>
                )}
                {(b.payment_status === 'pending' || (b.payment_status === 'paid' && b.ends_at && new Date(b.ends_at) > now)) && (
                  <button className="btn-danger-sm" onClick={() => cancel(b.id)}>Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
