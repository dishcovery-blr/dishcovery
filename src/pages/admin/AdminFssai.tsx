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
      .in('fssai_status', ['in_progress', 'not_submitted'])
      .order('created_at', { ascending: false })
    setSellers(data ?? [])
    setLoading(false)
  }

  async function updateFssai(id: string, status: string) {
    await supabase.from('sellers').update({ fssai_status: status }).eq('id', id)
    setSellers(sellers.map(s => s.id === id ? { ...s, fssai_status: status as any } : s))
    await supabase.from('admin_logs').insert({ action: `fssai_${status}`, target_id: id, target_type: 'seller' })
  }

  if (loading) return <div className="page-loading">Loading…</div>

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">FSSAI Review</h1>
      <p style={{ color: '#888', fontSize: 14, marginBottom: 20 }}>
        Sellers who have submitted FSSAI numbers or are in progress. Verify against the FSSAI portal before marking as verified.
      </p>

      {sellers.length === 0 ? (
        <div className="admin-empty">No FSSAI documents pending review.</div>
      ) : (
        <div className="admin-seller-list">
          {sellers.map(seller => (
            <div key={seller.id} className="admin-seller-card">
              <div className="admin-seller-top">
                <div>
                  <div className="admin-seller-name">{seller.display_name}</div>
                  <div className="admin-seller-meta">
                    <span className={`fssai-pill ${seller.fssai_status}`}>{seller.fssai_status.replace('_', ' ')}</span>
                    <span>📍 {seller.location_text}</span>
                  </div>
                  {seller.fssai_number && (
                    <div style={{ marginTop: 6, fontSize: 13 }}>
                      FSSAI number: <strong>{seller.fssai_number}</strong>
                      <a
                        href={`https://foscos.fssai.gov.in/verify?reg=${seller.fssai_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ marginLeft: 8, color: '#1D9E75', fontSize: 12 }}
                      >
                        Verify on FSSAI ↗
                      </a>
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
                <button className="admin-btn green" onClick={() => updateFssai(seller.id, 'verified')}>
                  ✓ Mark verified
                </button>
                <button className="admin-btn red-outline" onClick={() => updateFssai(seller.id, 'not_submitted')}>
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
