import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase, trackProfileView, trackWhatsappTap } from '../../lib/supabase'
import type { Seller, MenuItem, MenuCategory, Offer, SellerPhoto, Review } from '../../types/database'

type Tab = 'about' | 'gallery' | 'menu' | 'reviews'

interface SellerFull extends Seller {
  menu_categories: (MenuCategory & { menu_items: MenuItem[] })[]
  menu_items: MenuItem[]
  offers: Offer[]
  seller_photos: SellerPhoto[]
  reviews: (Review & { consumers: { display_name: string } | null })[]
}

export default function SellerProfilePage() {
  const { sellerId } = useParams<{ sellerId: string }>()
  const [seller, setSeller] = useState<SellerFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('about')
  const [avgRating, setAvgRating] = useState(0)

  useEffect(() => {
    if (sellerId) {
      loadSeller(sellerId)
      trackProfileView(sellerId)
    }
  }, [sellerId])

  async function loadSeller(id: string) {
    const { data, error } = await supabase
      .from('sellers')
      .select(`
        *,
        menu_categories (
          *,
          menu_items (*)
        ),
        menu_items (*),
        offers (*),
        seller_photos (*),
        reviews (
          *,
          consumers (display_name)
        )
      `)
      .eq('id', id)
      .eq('status', 'approved')
      .single()

    if (!error && data) {
      setSeller(data as SellerFull)
      const reviews = data.reviews ?? []
      if (reviews.length > 0) {
        const avg = reviews.reduce((sum: number, r: Review) => sum + r.rating, 0) / reviews.length
        setAvgRating(Math.round(avg * 10) / 10)
      }
    }
    setLoading(false)
  }

  function handleWhatsappTap() {
    if (!seller) return
    trackWhatsappTap(seller.id)
    const msg = encodeURIComponent(`Hi, I found you on Dishcovery and would like to place an order!`)
    window.open(`https://wa.me/${seller.whatsapp_number}?text=${msg}`, '_blank')
  }

  if (loading) return <div className="page-loading">Loading…</div>
  if (!seller) return <div className="page-error">Seller not found.</div>

  const activeOffers = seller.offers?.filter(o => o.is_active && new Date(o.expires_at) > new Date()) ?? []

  return (
    <div className="profile-page">

      {/* Cover photo */}
      <div className="profile-cover">
        {seller.cover_photo_url
          ? <img src={seller.cover_photo_url} alt="Cover" className="cover-img" />
          : <div className="cover-placeholder" />
        }
      </div>

      {/* Avatar + WhatsApp CTA */}
      <div className="profile-avatar-row">
        <div className="profile-avatar">
          {seller.avatar_url
            ? <img src={seller.avatar_url} alt={seller.display_name} />
            : <span>{seller.display_name.charAt(0)}</span>
          }
        </div>
        <button className="whatsapp-btn" onClick={handleWhatsappTap}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Order on WhatsApp
        </button>
      </div>

      {/* Name + meta */}
      <div className="profile-meta">
        <h1 className="profile-name">{seller.display_name}</h1>
        <span className="seller-type-pill">
          {seller.seller_type === 'home_cook' ? 'Home Cook' : 'Baker'}
        </span>
        <div className="profile-location">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {seller.location_text ?? 'Bangalore'}
          {seller.delivery_radius_km && ` · ${seller.delivery_radius_km} km delivery`}
        </div>
        <div className="profile-tags">
          {seller.cuisine_tags?.map(t => <span key={t} className="profile-tag">{t}</span>)}
          {seller.dietary_tags?.map(t => <span key={t} className="profile-tag dietary">{t}</span>)}
          {seller.accepts_custom_orders && <span className="profile-tag custom">Custom orders</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="profile-stats">
        <div className="stat">
          <span className="stat-val">{avgRating > 0 ? avgRating : '—'}</span>
          <span className="stat-label">Rating</span>
        </div>
        <div className="stat">
          <span className="stat-val">{seller.reviews?.length ?? 0}</span>
          <span className="stat-label">Reviews</span>
        </div>
        <div className="stat">
          <span className="stat-val">{seller.menu_items?.length ?? 0}</span>
          <span className="stat-label">Menu items</span>
        </div>
        <div className="stat">
          <span className="stat-val">{seller.profile_views}</span>
          <span className="stat-label">Views</span>
        </div>
      </div>

      {/* FSSAI badge */}
      <div className="profile-badges">
        {seller.fssai_status === 'verified' && (
          <div className="badge-fssai verified">✓ FSSAI verified · {seller.fssai_number}</div>
        )}
        {seller.fssai_status === 'in_progress' && (
          <div className="badge-fssai pending">⏳ FSSAI registration in progress</div>
        )}
        {seller.fssai_status === 'not_submitted' && (
          <div className="badge-fssai missing">⚠ FSSAI registration pending</div>
        )}
      </div>

      {/* Active offers */}
      {activeOffers.length > 0 && (
        <div className="active-offers">
          {activeOffers.map(offer => (
            <div key={offer.id} className="offer-banner">
              <span className="offer-title">🏷 {offer.title}</span>
              <span className="offer-expiry">
                Expires {new Date(offer.expires_at).toLocaleDateString('en-IN', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="profile-tabs">
        {(['about', 'gallery', 'menu', 'reviews'] as Tab[]).map(t => (
          <button
            key={t}
            className={`profile-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="profile-tab-content">
        {tab === 'about' && <AboutTab seller={seller} />}
        {tab === 'gallery' && <GalleryTab photos={seller.seller_photos ?? []} />}
        {tab === 'menu' && <MenuTab categories={seller.menu_categories ?? []} items={seller.menu_items ?? []} photos={seller.seller_photos ?? []} />}
        {tab === 'reviews' && <ReviewsTab reviews={seller.reviews ?? []} avgRating={avgRating} seller={seller} onWhatsapp={handleWhatsappTap} />}
      </div>
    </div>
  )
}

// ── About tab ──────────────────────────────────────────────────
function AboutTab({ seller }: { seller: SellerFull }) {
  return (
    <div className="tab-about">
      {seller.bio && (
        <section className="about-section">
          <h2>About the kitchen</h2>
          <p>{seller.bio}</p>
        </section>
      )}

      {seller.operating_hours && (
        <section className="about-section">
          <h2>Hours</h2>
          <p className="hours-text">{seller.operating_hours}</p>
        </section>
      )}

      <section className="about-section">
        <h2>Location</h2>
        <div className="location-block">
          <p>{seller.location_text ?? 'Bangalore'}</p>
          {seller.delivery_radius_km && (
            <p className="delivery-note">Delivers within {seller.delivery_radius_km} km</p>
          )}
        </div>
      </section>
    </div>
  )
}

// ── Gallery tab ─────────────────────────────────────────────────
function GalleryTab({ photos }: { photos: SellerPhoto[] }) {
  const [selected, setSelected] = useState<SellerPhoto | null>(null)

  const galleryPhotos = photos.filter(p => p.photo_type === 'gallery')

  if (galleryPhotos.length === 0) {
    return <div className="tab-empty">No gallery posts yet.</div>
  }

  return (
    <div className="tab-gallery">
      <div className="gallery-grid">
        {galleryPhotos.map(photo => (
          <div key={photo.id} className="gallery-item" onClick={() => setSelected(photo)}>
            <img
              src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/seller-media/${photo.storage_path}`}
              alt={photo.caption ?? 'Gallery photo'}
              className="gallery-img"
            />
            {photo.caption && <div className="gallery-caption">{photo.caption}</div>}
          </div>
        ))}
      </div>

      {selected && (
        <div className="gallery-modal-overlay" onClick={() => setSelected(null)}>
          <div className="gallery-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            <img
              src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/seller-media/${selected.storage_path}`}
              alt={selected.caption ?? ''}
              className="modal-img"
            />
            {selected.caption && <p className="modal-caption">{selected.caption}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Menu tab ────────────────────────────────────────────────────
function MenuTab({ categories, items, photos }: {
  categories: (MenuCategory & { menu_items: MenuItem[] })[]
  items: MenuItem[]
  photos: SellerPhoto[]
}) {
  const uncategorised = items.filter(i => !i.category_id && i.is_available)

  function getPhotoForItem(item: MenuItem) {
    if (!item.photo_url) return null
    return photos.find(p => p.storage_path === item.photo_url)
  }

  if (items.length === 0) {
    return <div className="tab-empty">Menu coming soon.</div>
  }

  return (
    <div className="tab-menu">
      {categories.map(cat => {
        const catItems = cat.menu_items?.filter(i => i.is_available) ?? []
        if (catItems.length === 0) return null
        return (
          <div key={cat.id} className="menu-category">
            <h3 className="menu-cat-title">{cat.name}</h3>
            {catItems.map(item => (
              <MenuItemRow key={item.id} item={item} linkedPhoto={getPhotoForItem(item)} />
            ))}
          </div>
        )
      })}

      {uncategorised.length > 0 && (
        <div className="menu-category">
          <h3 className="menu-cat-title">Menu</h3>
          {uncategorised.map(item => (
            <MenuItemRow key={item.id} item={item} linkedPhoto={getPhotoForItem(item)} />
          ))}
        </div>
      )}
    </div>
  )
}

function MenuItemRow({ item, linkedPhoto }: { item: MenuItem; linkedPhoto: SellerPhoto | null }) {
  return (
    <div className="menu-item">
      <div className="menu-item-dot" style={{ background: item.is_veg ? '#3B6D11' : '#993C1D' }} />
      {item.photo_url && (
        <img
          src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/seller-media/${item.photo_url}`}
          alt={item.name}
          className="menu-item-thumb"
        />
      )}
      <div className="menu-item-info">
        <span className="menu-item-name">{item.name}</span>
        {item.description && <span className="menu-item-desc">{item.description}</span>}
        {item.dietary_flags?.length > 0 && (
          <div className="menu-item-flags">
            {item.dietary_flags.map(f => <span key={f} className="dietary-flag">{f}</span>)}
          </div>
        )}
        {linkedPhoto && (
          <span className="gallery-link">📷 See photo</span>
        )}
      </div>
      <span className="menu-item-price">₹{item.price}</span>
    </div>
  )
}

// ── Reviews + Contact tab ───────────────────────────────────────
function ReviewsTab({ reviews, avgRating, seller, onWhatsapp }: {
  reviews: (Review & { consumers: { display_name: string } | null })[]
  avgRating: number
  seller: SellerFull
  onWhatsapp: () => void
}) {
  function stars(n: number) {
    return '★'.repeat(n) + '☆'.repeat(5 - n)
  }

  return (
    <div className="tab-reviews">
      {/* Contact section */}
      <section className="contact-section">
        <h2>Contact</h2>
        <button className="contact-row whatsapp" onClick={onWhatsapp}>
          <span className="contact-icon">💬</span>
          <span>WhatsApp · {seller.whatsapp_number}</span>
        </button>
        {seller.instagram_url && (
          <a className="contact-row" href={seller.instagram_url} target="_blank" rel="noopener noreferrer">
            <span className="contact-icon">📸</span>
            <span>Instagram</span>
          </a>
        )}
        <div className="contact-row">
          <span className="contact-icon">📍</span>
          <span>{seller.location_text ?? 'Bangalore'}</span>
        </div>
      </section>

      {/* Rating summary */}
      <section className="reviews-section">
        <h2>Reviews</h2>
        {reviews.length > 0 ? (
          <>
            <div className="rating-summary">
              <span className="big-rating">{avgRating}</span>
              <div>
                <div className="stars">{stars(Math.round(avgRating))}</div>
                <div className="review-count">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
              </div>
            </div>

            <div className="review-list">
              {reviews.map(review => (
                <div key={review.id} className="review-card">
                  <div className="reviewer-row">
                    <div className="reviewer-avatar">
                      {(review.consumers?.display_name ?? 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="reviewer-name">{review.consumers?.display_name ?? 'Anonymous'}</div>
                      <div className="reviewer-meta">
                        <span className="review-stars">{stars(review.rating)}</span>
                        <span className="review-date">
                          {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {review.body && <p className="review-body">{review.body}</p>}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="no-reviews">No reviews yet. Be the first to leave one!</p>
        )}
      </section>
    </div>
  )
}
