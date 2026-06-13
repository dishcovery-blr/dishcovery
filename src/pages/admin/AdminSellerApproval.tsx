import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Seller, FssaiDocument } from '../../types/database'

export default function AdminSellerApproval() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')

  useEffect(() => {
    loadSellers()
  }, [filter])

  async function loadSellers() {
    setLoading(true)
    const { data } = await supabase
      .from('sellers')
      .select('*')
      .eq('status', filter)
      .order('created_at', { ascending: false })
    setSellers(data ?? [])
    setLoading(false)
  }

  async function approveSeller(id: string) {
    await supabase.from('sellers').update({ status: 'approved' }).eq('id', id)
    await supabase.functions.invoke('send-email', {
      body: { type: 'seller_approved', seller_id: id },
    })
    await supabase.from('admin_logs').insert({
      action: 'approved_seller',
      target_id: id,
      target_type: 'seller',
    })
    loadSellers()
  }

  async function rejectSeller(id: string, notes: string) {
    await supabase.from('sellers').update({ status: 'rejected' }).eq('id', id)
    await supabase.functions.invoke('send-email', {
      body: { type: 'seller_rejected', seller_id: id, notes },
    })
    await supabase.from('admin_logs').insert({
      action: 'rejected_seller',
      target_id: id,
      target_type: 'seller',
      notes,
    })
    loadSellers()
  }

  return (
    <div className="admin-page">
      <h1>Seller applications</h1>

      <div className="filter-tabs">
        {(['pending', 'approved', 'rejected'] as const).map(f => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : sellers.length === 0 ? (
        <p className="empty">No {filter} applications.</p>
      ) : (
        <div className="seller-list">
          {sellers.map(seller => (
            <SellerApprovalCard
              key={seller.id}
              seller={seller}
              onApprove={() => approveSeller(seller.id)}
              onReject={(notes) => rejectSeller(seller.id, notes)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SellerApprovalCard({
  seller,
  onApprove,
  onReject,
}: {
  seller: Seller
  onApprove: () => void
  onReject: (notes: string) => void
}) {
  const [rejectionNotes, setRejectionNotes] = useState('')
  const [showReject, setShowReject] = useState(false)

  const fssaiBadge = {
    not_submitted: { label: 'FSSAI not submitted', color: '#dc2626' },
    in_progress:   { label: 'FSSAI in progress', color: '#d97706' },
    verified:      { label: 'FSSAI verified', color: '#16a34a' },
    expired:       { label: 'FSSAI expired', color: '#dc2626' },
  }[seller.fssai_status]

  return (
    <div className="seller-card">
      <div className="seller-card-header">
        <div>
          <h3>{seller.display_name}</h3>
          <span className="seller-type-badge">{seller.seller_type.replace('_', ' ')}</span>
          <span style={{ color: fssaiBadge.color, fontSize: 12, marginLeft: 8 }}>
            {fssaiBadge.label}
          </span>
        </div>
        <span className="created-at">
          {new Date(seller.created_at).toLocaleDateString('en-IN')}
        </span>
      </div>

      <div className="seller-card-body">
        <p>{seller.bio || <em>No bio provided</em>}</p>
        <div className="seller-meta">
          <span>📍 {seller.location_text}</span>
          <span>📱 {seller.whatsapp_number}</span>
          {seller.fssai_number && <span>FSSAI: {seller.fssai_number}</span>}
        </div>
        {seller.cuisine_tags.length > 0 && (
          <div className="tags">
            {seller.cuisine_tags.map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        )}
      </div>

      {seller.status === 'pending' && (
        <div className="seller-card-actions">
          {!showReject ? (
            <>
              <button className="btn-success" onClick={onApprove}>Approve</button>
              <button className="btn-danger-outline" onClick={() => setShowReject(true)}>
                Reject
              </button>
            </>
          ) : (
            <div className="reject-form">
              <textarea
                placeholder="Reason for rejection (sent to seller)"
                value={rejectionNotes}
                onChange={e => setRejectionNotes(e.target.value)}
                rows={2}
              />
              <div className="reject-actions">
                <button className="btn-secondary" onClick={() => setShowReject(false)}>Cancel</button>
                <button className="btn-danger" onClick={() => onReject(rejectionNotes)}>
                  Confirm rejection
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
