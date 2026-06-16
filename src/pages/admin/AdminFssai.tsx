import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Seller } from '../../types/database'

export default function AdminFssai() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadSellers() }, [])

  async function loadSellers() {
    const { data } = await supabase
      .from('sellers')
      .select('*')
      .or('fssai_status.in.(in_progress,not_submitted),status.eq.active_unverified')
      .order('created_at', { ascending: false })
    setSellers(data ?? [])
    setLoading(false)
  }

  async function verifyAndActivate(seller: Seller) {
    await supabase.from('sellers').update({
      fssai_status: 'verified',
      status: 'approved',
    }).eq('id', seller.id)
    await supabase.from('admin_logs').insert({
      action: 'fssai_verified_and_activated',
      target_id: seller.id,
      target_type: 'seller',
    })
    setSellers(sellers.map(s => s.id === seller.id
      ? { ...s, fssai_status: 'verified' as any, status: 'approved' as any }
      : s
    ))
  }

  async function rejectFssai(seller: Seller) {
    await supabase.from('sellers').update({ fssai_status: 'not_submitted' }).eq('id', seller.id)
    setSellers(sellers.map(s => s.id === seller.id ? { ...s, fssai_status: 'not_submitted' as any } : s))
  }

  if (loading) return <div className="page-loading">Loading…</div>

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">FSSAI Verification</h1>
      <p style={{ color: '#888', fontSize: 14, marginBottom: 20 }}>
        Verify each seller's FSSAI number on{' '}
        <a href="https://foscos.fssai.gov.in" target="_blank" rel="noopener noreferrer" style={{ color: '#1D9E75' }}>
          foscos.fssai.gov.in
        </a>{' '}
        before activating their listing.
      </p>

      {sellers.length === 0 ? (
        <div className="admin-empty">No sellers pending FSSAI verification.</div>
      ) : (
        <div className="admin-seller-list">
          {sellers.map(seller => (
            <div key={seller.id} className="admin-seller-card">
              <div className="admin-seller-top">
                <div>
                  <div className="admin-seller-name">{seller.display_name}</div>
                  <div className="admin-seller-meta">
                    <span className={`admin-status-pill ${seller.status}`}>{seller.status.replace('_', ' ')}</span>
                    <span className={`fssai-pill ${seller.fssai_status}`}>{seller.fssai_status.replace('_', ' ')}</span>
                    <span>📍 {seller.location_text}</span>
                    <span>📱 {seller.whatsapp_number}</span>
                  </div>
                  {seller.fssai_number ? (
                    <div style={{ marginTop: 6, fontSize: 13 }}>
                      FSSAI: <strong>{seller.fssai_number}</strong>
                      
                        href="https://foscos.fssai.gov.in"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ marginLeft: 8, color: '#1D9E75', fontSize: 12 }}
                      >
                        Verify on portal ↗
                      </a>
                    </div>
                  ) : (
                    <div style={{ marginTop: 6, fontSize: 13, color: '#888' }}>
                      No FSSAI number submitted yet
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                    Grace deadline: {seller.fssai_grace_deadline
                      ? new Date(seller.fssai_grace_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'
                    }
                  </div>
                </div>
              </div>
              <div className="admin-seller-actions">
                {seller.fssai_number && (
                  <button className="admin-btn green" onClick={() => verifyAndActivate(seller)}>
                    ✓ Verify FSSAI & Go Live
                  </button>
                )}
                <button className="admin-btn red-outline" onClick={() => rejectFssai(seller)}>
                  Reject / Reset
                </button>
                <a className="admin-btn outline" href={`/seller/${seller.id}`} target="_blank" rel="noopener noreferrer">
                  View listing ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}