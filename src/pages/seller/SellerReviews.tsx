import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Review } from '../../types/database'

type ReviewWithConsumer = Review & { consumers: { display_name: string } | null }

export default function SellerReviews() {
  const { seller } = useAuth()
  const navigate = useNavigate()
  const [reviews, setReviews] = useState<ReviewWithConsumer[]>([])
  const [loading, setLoading] = useState(true)
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    if (seller) load()
  }, [seller])

  async function load() {
    if (!seller) return
    const { data } = await supabase
      .from('reviews')
      .select('*, consumers(display_name)')
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: false })
    setReviews((data ?? []) as ReviewWithConsumer[])
    setLoading(false)
  }

  async function saveReply(reviewId: string) {
    const reply = replyDraft[reviewId]?.trim()
    if (!reply) return
    setSaving(reviewId)
    await supabase.from('reviews').update({ seller_reply: reply }).eq('id', reviewId)
    setReviews(reviews.map(r => r.id === reviewId ? { ...r, seller_reply: reply } : r))
    setReplyDraft(d => ({ ...d, [reviewId]: '' }))
    setSaving(null)
  }

  async function deleteReply(reviewId: string) {
    await supabase.from('reviews').update({ seller_reply: null }).eq('id', reviewId)
    setReviews(reviews.map(r => r.id === reviewId ? { ...r, seller_reply: null } : r))
  }

  function stars(n: number) { return '★'.repeat(n) + '☆'.repeat(5 - n) }

  const avgRating = reviews.length
    ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length * 10) / 10
    : 0

  if (loading) return <div className="page-loading">Loading…</div>

  return (
    <div className="editor-page">
      <div className="editor-header">
        <button className="back-btn" onClick={() => navigate('/seller/dashboard')}>← Back</button>
        <h1>Reviews</h1>
      </div>

      <div className="editor-form">
        {reviews.length === 0 ? (
          <div className="offers-empty"><p>No reviews yet. They'll appear here once customers start leaving feedback.</p></div>
        ) : (
          <>
            <div className="seller-reviews-summary">
              <span className="big-rating">{avgRating}</span>
              <div>
                <div className="stars">{stars(Math.round(avgRating))}</div>
                <div className="review-count">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
              </div>
            </div>

            <div className="review-list">
              {reviews.map(review => (
                <div key={review.id} className="review-card seller-view">
                  <div className="reviewer-row">
                    <div className="reviewer-avatar">{(review.consumers?.display_name ?? 'A').charAt(0).toUpperCase()}</div>
                    <div>
                      <div className="reviewer-name">{review.consumers?.display_name ?? 'Anonymous'}</div>
                      <div className="reviewer-meta">
                        <span className="review-stars">{stars(review.rating)}</span>
                        <span className="review-date">{new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                  {review.body && <p className="review-body">{review.body}</p>}

                  <div className="seller-reply-section">
                    {review.seller_reply ? (
                      <div className="seller-reply-display">
                        <span className="seller-reply-label">Your reply</span>
                        <p className="seller-reply-text">{review.seller_reply}</p>
                        <button className="delete-reply-btn" onClick={() => deleteReply(review.id)}>Remove reply</button>
                      </div>
                    ) : (
                      <div className="seller-reply-form">
                        <textarea
                          rows={2}
                          placeholder="Write a reply…"
                          value={replyDraft[review.id] ?? ''}
                          onChange={e => setReplyDraft(d => ({ ...d, [review.id]: e.target.value }))}
                        />
                        <button
                          className="btn-primary-sm"
                          onClick={() => saveReply(review.id)}
                          disabled={saving === review.id || !replyDraft[review.id]?.trim()}
                        >
                          {saving === review.id ? 'Saving…' : 'Post reply'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
