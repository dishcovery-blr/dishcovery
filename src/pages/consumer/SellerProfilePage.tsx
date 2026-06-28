import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase, trackProfileView, trackWhatsappTap } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Seller, MenuItem, MenuCategory, Offer, SellerPhoto, Review, Consumer } from '../../types/database'

type Tab = 'about' | 'gallery' | 'menu' | 'reviews'
type MenuFilter = 'all' | 'veg' | 'nonveg' | 'vegan' | 'eggless'
type ReviewFilter = 'newest' | 'highest' | 'lowest'

type ReviewWithConsumer = Review & { consumers: { display_name: string } | null }

interface CartItem {
  id: string
  type: 'menu' | 'gallery'
  name: string
  price?: number
  quantity: number
}

interface SellerFull extends Seller {
  menu_categories: (MenuCategory & { menu_items: MenuItem[] })[]
  menu_items: MenuItem[]
  offers: Offer[]
  seller_photos: SellerPhoto[]
}

export default function SellerProfilePage() {
  const { sellerId } = useParams<{ sellerId: string }>()
  const { consumer, role } = useAuth()
  const [seller, setSeller] = useState<SellerFull | null>(null)
  const [reviews, setReviews] = useState<ReviewWithConsumer[]>([])
  const [avgRating, setAvgRating] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('about')
  const [offerPopup, setOfferPopup] = useState<Offer | null>(null)
  const [popupDismissed, setPopupDismissed] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])

  useEffect(() => {
    if (sellerId) {
      loadSeller(sellerId)
      trackProfileView(sellerId)
    }
  }, [sellerId])

  function computeAvg(list: ReviewWithConsumer[]) {
    if (!list.length) return 0
    return Math.round(list.reduce((s, r) => s + r.rating, 0) / list.length * 10) / 10
  }

  async function loadSeller(id: string) {
    const { data, error } = await supabase
      .from('sellers')
      .select(`*, menu_categories (*, menu_items (*)), menu_items (*), offers (*), seller_photos (*), reviews (*, consumers (display_name))`)
      .eq('id', id)
      .eq('status', 'approved')
      .single()

    if (!error && data) {
      const { reviews: rawReviews, ...rest } = data as SellerFull & { reviews: ReviewWithConsumer[] }
      setSeller(rest)
      setReviews(rawReviews ?? [])
      setAvgRating(computeAvg(rawReviews ?? []))
      const activeWithPoster = (data.offers ?? []).find((o: Offer) =>
        o.is_active && new Date(o.expires_at) > new Date() && o.photo_urls?.length > 0
      )
      if (activeWithPoster) setOfferPopup(activeWithPoster)
    }
    setLoading(false)
  }

  async function submitReview(rating: number, body: string, existingId?: string) {
    if (!consumer || !sellerId) return
    if (existingId) {
      const { data } = await supabase
        .from('reviews')
        .update({ rating, body: body || null })
        .eq('id', existingId)
        .select('*, consumers(display_name)')
        .single()
      if (data) {
        const updated = reviews.map(r => r.id === existingId ? (data as ReviewWithConsumer) : r)
        setReviews(updated)
        setAvgRating(computeAvg(updated))
      }
    } else {
      const { data } = await supabase
        .from('reviews')
        .insert({ seller_id: sellerId, consumer_id: consumer.id, rating, body: body || null })
        .select('*, consumers(display_name)')
        .single()
      if (data) {
        const updated = [...reviews, data as ReviewWithConsumer]
        setReviews(updated)
        setAvgRating(computeAvg(updated))
      }
    }
  }

  // ── Cart helpers ─────────────────────────────────────────────
  function cartQty(id: string) { return cart.find(i => i.id === id)?.quantity ?? 0 }

  function addToCart(item: Omit<CartItem, 'quantity'>) {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  function removeFromCart(id: string) {
    setCart(prev => {
      const existing = prev.find(i => i.id === id)
      if (!existing) return prev
      if (existing.quantity <= 1) return prev.filter(i => i.id !== id)
      return prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i)
    })
  }

  function buildCartMessage(): string {
    const menuItems = cart.filter(i => i.type === 'menu')
    const galleryItems = cart.filter(i => i.type === 'gallery')
    let msg = `Hi! I found you on Dishcovery and would like to place an order:\n\n`
    if (menuItems.length > 0) {
      msg += menuItems.map(i => `• ${i.name} × ${i.quantity} — ₹${(i.price! * i.quantity).toLocaleString('en-IN')}`).join('\n')
    }
    if (galleryItems.length > 0) {
      if (menuItems.length > 0) msg += '\n\n'
      msg += 'Also interested in:\n'
      msg += galleryItems.map(i => `• ${i.name}`).join('\n')
    }
    const total = menuItems.reduce((s, i) => s + i.price! * i.quantity, 0)
    if (total > 0) msg += `\n\nTotal: ₹${total.toLocaleString('en-IN')}`
    msg += '\n\nPlease confirm availability!'
    return msg
  }

  function handleWhatsappTap() {
    if (!seller) return
    trackWhatsappTap(seller.id)
    const text = cart.length > 0 ? buildCartMessage() : `Hi, I found you on Dishcovery and would like to place an order!`
    window.open(`https://wa.me/${seller.whatsapp_number}?text=${encodeURIComponent(text)}`, '_blank')
  }

  function getUrl(path: string) {
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/seller-media/${path}`
  }

  if (loading) return <div className="page-loading">Loading…</div>
  if (!seller) return <div className="page-error">Seller not found.</div>

  const isClosed = seller.operating_hours === 'TEMPORARILY_CLOSED'
  const cartTotal = cart.filter(i => i.type === 'menu').reduce((s, i) => s + i.price! * i.quantity, 0)
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const myReview = consumer ? reviews.find(r => r.consumer_id === consumer.id) : undefined

  return (
    <div className="profile-page" style={{ paddingBottom: cart.length > 0 ? 72 : 0 }}>

      {/* Offer popup */}
      {offerPopup && !popupDismissed && (
        <div className="offer-popup-overlay" onClick={() => setPopupDismissed(true)}>
          <div className="offer-popup" onClick={e => e.stopPropagation()}>
            <button className="offer-popup-close" onClick={() => setPopupDismissed(true)}>✕</button>
            <img src={getUrl(offerPopup.photo_urls[0])} alt={offerPopup.title} className="offer-popup-img" />
            <div className="offer-popup-body">
              <h3>{offerPopup.title}</h3>
              {offerPopup.body && <p>{offerPopup.body}</p>}
              <p className="offer-popup-expiry">
                Expires {new Date(offerPopup.expires_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
              <button className="whatsapp-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={() => { setPopupDismissed(true); handleWhatsappTap() }}>
                Order now on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cover */}
      <div className="profile-cover">
        {seller.cover_photo_url
          ? <img src={getUrl(seller.cover_photo_url)} alt="Cover" className="cover-img" />
          : <div className="cover-placeholder" />
        }
      </div>

      {/* Avatar + name + bio */}
      <div className="profile-hero">
        <div className="profile-avatar">
          {seller.avatar_url
            ? <img src={getUrl(seller.avatar_url)} alt={seller.display_name} />
            : <span>{seller.display_name.charAt(0)}</span>
          }
        </div>
        <div className="profile-hero-text">
          <h1 className="profile-name">{seller.display_name}</h1>
          {seller.bio && <p className="profile-bio-short">{seller.bio}</p>}
        </div>
      </div>

      {/* WhatsApp button */}
      <div className="profile-whatsapp-row">
        <button className="whatsapp-btn" onClick={handleWhatsappTap}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          {cart.length > 0 ? `Order on WhatsApp (${cartCount})` : 'Order on WhatsApp'}
        </button>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        {(['about', 'menu', 'gallery', 'reviews'] as Tab[]).map(t => (
          <button key={t} className={`profile-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'about' ? 'Profile'
              : t === 'reviews' ? `Reviews${reviews.length > 0 ? ` (${reviews.length})` : ''}`
              : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="profile-tab-content">
        {tab === 'about' && <AboutTab seller={seller} isClosed={isClosed} getUrl={getUrl} onWhatsapp={handleWhatsappTap} />}
        {tab === 'gallery' && (
          <GalleryTab
            photos={seller.seller_photos ?? []}
            getUrl={getUrl}
            cartIds={new Set(cart.map(i => i.id))}
            onToggle={photo => {
              if (cart.find(i => i.id === photo.id)) {
                setCart(prev => prev.filter(i => i.id !== photo.id))
              } else {
                addToCart({ id: photo.id, type: 'gallery', name: photo.caption || 'Gallery item' })
              }
            }}
          />
        )}
        {tab === 'menu' && (
          <MenuTab
            categories={seller.menu_categories ?? []}
            items={seller.menu_items ?? []}
            getUrl={getUrl}
            cartQty={cartQty}
            onAdd={item => addToCart({ id: item.id, type: 'menu', name: item.name, price: item.price })}
            onRemove={id => removeFromCart(id)}
          />
        )}
        {tab === 'reviews' && (
          <ReviewsTab
            reviews={reviews}
            avgRating={avgRating}
            consumer={consumer}
            role={role}
            myReview={myReview}
            onSubmit={submitReview}
          />
        )}
      </div>

      {/* Floating cart bar */}
      {cart.length > 0 && (
        <div className="cart-bar">
          <div className="cart-bar-info">
            <span className="cart-bar-count">🛒 {cartCount} {cartCount === 1 ? 'item' : 'items'}</span>
            {cartTotal > 0 && <span className="cart-bar-total">₹{cartTotal.toLocaleString('en-IN')}</span>}
          </div>
          <button className="cart-bar-whatsapp" onClick={handleWhatsappTap}>Order on WhatsApp</button>
          <button className="cart-bar-clear" onClick={() => setCart([])} title="Clear cart">✕</button>
        </div>
      )}
    </div>
  )
}

// ── About / Profile tab ────────────────────────────────────────
function AboutTab({ seller, isClosed, getUrl, onWhatsapp }: {
  seller: SellerFull
  isClosed: boolean
  getUrl: (p: string) => string
  onWhatsapp: () => void
}) {
  return (
    <div className="tab-about">
      {isClosed && <div className="closed-notice">🔴 This kitchen is temporarily closed. Check back soon!</div>}
      {seller.bio && (
        <section className="about-section">
          <h2>About the kitchen</h2>
          <p>{seller.bio}</p>
        </section>
      )}
      {(seller.team_bio || seller.group_photo_url) && (
        <section className="about-section">
          <h2>About the team</h2>
          {seller.group_photo_url && <img src={getUrl(seller.group_photo_url)} alt="Team photo" className="group-photo-img" />}
          {seller.team_bio && <p>{seller.team_bio}</p>}
        </section>
      )}
      {seller.operating_hours && !isClosed && (
        <section className="about-section">
          <h2>Hours</h2>
          <p className="hours-text">{seller.operating_hours}</p>
        </section>
      )}
      <section className="about-section">
        <h2>Location</h2>
        <p>{seller.location_text ?? 'Bangalore'}</p>
        {seller.delivery_radius_km && <p className="delivery-note">Delivers within {seller.delivery_radius_km} km</p>}
      </section>
      <section className="contact-section">
        <h2>Contact</h2>
        <button className="contact-row whatsapp" onClick={onWhatsapp}>
          <span className="contact-icon">💬</span><span>WhatsApp · {seller.whatsapp_number}</span>
        </button>
        {seller.instagram_url && (
          <a className="contact-row" href={seller.instagram_url} target="_blank" rel="noopener noreferrer">
            <span className="contact-icon">📸</span><span>Instagram</span>
          </a>
        )}
      </section>
    </div>
  )
}

// ── Gallery tab ────────────────────────────────────────────────
function GalleryTab({ photos, getUrl, cartIds, onToggle }: {
  photos: SellerPhoto[]
  getUrl: (p: string) => string
  cartIds: Set<string>
  onToggle: (photo: SellerPhoto) => void
}) {
  const [selected, setSelected] = useState<SellerPhoto | null>(null)
  const galleryPhotos = photos.filter(p => p.photo_type === 'gallery')
  if (galleryPhotos.length === 0) return <div className="tab-empty">No gallery posts yet.</div>
  return (
    <div className="tab-gallery">
      <div className="gallery-grid">
        {galleryPhotos.map(photo => (
          <div key={photo.id} className="gallery-item">
            <img src={getUrl(photo.storage_path)} alt={photo.caption ?? ''} className="gallery-img" onClick={() => setSelected(photo)} />
            {photo.caption && <div className="gallery-caption">{photo.caption}</div>}
            <button
              className={`gallery-add-btn ${cartIds.has(photo.id) ? 'added' : ''}`}
              onClick={e => { e.stopPropagation(); onToggle(photo) }}
            >
              {cartIds.has(photo.id) ? '✓ Added' : '+ Add'}
            </button>
          </div>
        ))}
      </div>
      {selected && (
        <div className="gallery-modal-overlay" onClick={() => setSelected(null)}>
          <div className="gallery-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            <img src={getUrl(selected.storage_path)} alt={selected.caption ?? ''} className="modal-img" />
            {selected.caption && <p className="modal-caption">{selected.caption}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Menu tab ───────────────────────────────────────────────────
function applyFilter(items: MenuItem[], filter: MenuFilter): MenuItem[] {
  if (filter === 'all') return items
  if (filter === 'veg') return items.filter(i => i.is_veg)
  if (filter === 'nonveg') return items.filter(i => !i.is_veg)
  if (filter === 'vegan') return items.filter(i => i.dietary_flags?.includes('Vegan'))
  if (filter === 'eggless') return items.filter(i => i.dietary_flags?.includes('Eggless'))
  return items
}

function MenuTab({ categories, items, getUrl, cartQty, onAdd, onRemove }: {
  categories: (MenuCategory & { menu_items: MenuItem[] })[]
  items: MenuItem[]
  getUrl: (p: string) => string
  cartQty: (id: string) => number
  onAdd: (item: MenuItem) => void
  onRemove: (id: string) => void
}) {
  const [filter, setFilter] = useState<MenuFilter>('all')
  const availableItems = items.filter(i => i.is_available)
  if (availableItems.length === 0) return <div className="tab-empty">Menu coming soon.</div>

  const filters: { key: MenuFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'veg', label: 'Veg' },
    { key: 'nonveg', label: 'Non-Veg' },
    { key: 'vegan', label: 'Vegan' },
    { key: 'eggless', label: 'Eggless' },
  ]

  return (
    <div className="tab-menu">
      <div className="menu-filter-row">
        {filters.map(f => (
          <button key={f.key} className={`menu-filter-btn ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      {categories.map(cat => {
        const catItems = applyFilter(cat.menu_items?.filter(i => i.is_available) ?? [], filter)
        if (catItems.length === 0) return null
        return (
          <div key={cat.id} className="menu-category">
            <h3 className="menu-cat-title">{cat.name}</h3>
            {catItems.map(item => (
              <MenuItemRow key={item.id} item={item} getUrl={getUrl} qty={cartQty(item.id)} onAdd={() => onAdd(item)} onRemove={() => onRemove(item.id)} />
            ))}
          </div>
        )
      })}
      {(() => {
        const uncategorised = applyFilter(availableItems.filter(i => !i.category_id), filter)
        if (uncategorised.length === 0) return null
        return (
          <div className="menu-category">
            <h3 className="menu-cat-title">Menu</h3>
            {uncategorised.map(item => (
              <MenuItemRow key={item.id} item={item} getUrl={getUrl} qty={cartQty(item.id)} onAdd={() => onAdd(item)} onRemove={() => onRemove(item.id)} />
            ))}
          </div>
        )
      })()}
      {applyFilter(availableItems, filter).length === 0 && <div className="tab-empty">No items match this filter.</div>}
    </div>
  )
}

function MenuItemRow({ item, getUrl, qty, onAdd, onRemove }: {
  item: MenuItem; getUrl: (p: string) => string; qty: number; onAdd: () => void; onRemove: () => void
}) {
  return (
    <div className="menu-item">
      <div className="menu-item-dot" style={{ background: item.is_veg ? '#3B6D11' : '#993C1D' }} />
      <div className="menu-item-info">
        <span className="menu-item-name">{item.name}</span>
        {item.flavour && <span className="menu-item-flavour">{item.flavour}</span>}
        {item.dietary_flags?.length > 0 && <span className="menu-item-desc">{item.dietary_flags.join(' · ')}</span>}
      </div>
      <div className="menu-item-right">
        <div className="menu-item-price-cart">
          <span className="menu-item-price">₹{item.price}</span>
          {qty === 0 ? (
            <button className="add-to-cart-btn" onClick={onAdd}>+ Add</button>
          ) : (
            <div className="cart-qty-controls">
              <button className="qty-btn" onClick={onRemove}>−</button>
              <span className="qty-val">{qty}</span>
              <button className="qty-btn" onClick={onAdd}>+</button>
            </div>
          )}
        </div>
        {item.photo_url && <img src={getUrl(item.photo_url)} alt={item.name} className="menu-item-thumb" />}
      </div>
    </div>
  )
}

// ── Star input ─────────────────────────────────────────────────
function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="star-input">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          className={`star-input-btn ${n <= (hover || value) ? 'filled' : ''}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
        >★</button>
      ))}
    </div>
  )
}

// ── Reviews tab ────────────────────────────────────────────────
function ReviewsTab({ reviews, avgRating, consumer, role, myReview, onSubmit }: {
  reviews: ReviewWithConsumer[]
  avgRating: number
  consumer: Consumer | null
  role: string | null
  myReview: ReviewWithConsumer | undefined
  onSubmit: (rating: number, body: string, existingId?: string) => Promise<void>
}) {
  const [filter, setFilter] = useState<ReviewFilter>('newest')
  const [editing, setEditing] = useState(false)
  const [rating, setRating] = useState(myReview?.rating ?? 0)
  const [body, setBody] = useState(myReview?.body ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function stars(n: number) { return '★'.repeat(n) + '☆'.repeat(5 - n) }

  const sorted = [...reviews].sort((a, b) => {
    if (filter === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    if (filter === 'highest') return b.rating - a.rating
    if (filter === 'lowest') return a.rating - b.rating
    return 0
  })

  async function handleSubmit() {
    if (rating === 0) return
    setSubmitting(true)
    await onSubmit(rating, body, myReview?.id)
    setSubmitting(false)
    setEditing(false)
    setSubmitted(true)
  }

  const showForm = role === 'consumer' && (!myReview || editing)
  const showEditBtn = role === 'consumer' && myReview && !editing

  return (
    <div className="tab-reviews">

      {/* Review form */}
      {showForm && (
        <section className="review-form-section">
          <h2>{myReview ? 'Edit your review' : 'Rate and review'}</h2>
          <StarInput value={rating} onChange={setRating} />
          <textarea
            className="review-textarea"
            rows={3}
            placeholder="Share your experience (optional)…"
            value={body}
            onChange={e => setBody(e.target.value)}
          />
          <div className="review-form-actions">
            {editing && <button onClick={() => setEditing(false)}>Cancel</button>}
            <button
              className="btn-primary-sm"
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
            >
              {submitting ? 'Posting…' : myReview ? 'Update review' : 'Post review'}
            </button>
          </div>
          {submitted && !editing && <p className="review-submitted-msg">Review posted!</p>}
        </section>
      )}

      {/* Reviews list */}
      <section className="reviews-section">
        <div className="reviews-header">
          <h2>Reviews {reviews.length > 0 && <span className="review-count-inline">({reviews.length})</span>}</h2>
          {reviews.length > 1 && (
            <div className="review-filter-row">
              {(['newest', 'highest', 'lowest'] as ReviewFilter[]).map(f => (
                <button key={f} className={`review-filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {reviews.length > 0 && (
          <div className="rating-summary">
            <span className="big-rating">{avgRating}</span>
            <div>
              <div className="stars">{stars(Math.round(avgRating))}</div>
              <div className="review-count">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
        )}

        {showEditBtn && (
          <button className="edit-review-btn" onClick={() => { setEditing(true); setRating(myReview.rating); setBody(myReview.body ?? '') }}>
            Edit your review
          </button>
        )}

        {reviews.length === 0 ? (
          <p className="no-reviews">No reviews yet.{role === 'consumer' ? ' Be the first to leave one above!' : ''}</p>
        ) : (
          <div className="review-list">
            {sorted.map(review => (
              <div key={review.id} className="review-card">
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
                {review.seller_reply && (
                  <div className="seller-reply-consumer">
                    <span className="seller-reply-label">Reply from seller</span>
                    <p className="seller-reply-text">{review.seller_reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
