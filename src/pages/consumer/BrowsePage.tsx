import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { browseSellers, supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { SellerCard } from '../../types/database'

interface BoostBanner {
  id: string
  offers: { id: string; title: string; body: string | null; photo_urls: string[] }
  sellers: { id: string; display_name: string; avatar_url: string | null }
}

const CUISINE_OPTIONS = [
  'Cakes & Pastries', 'Bread & Loaves', 'Cookies', 'Chocolates',
  'South Indian', 'North Indian', 'Biryani', 'Snacks', 'Healthy & Diet',
  'Desserts', 'Continental', 'Beverages',
]

const DIETARY_OPTIONS = ['Eggless', 'Vegan', 'Gluten-Free', 'Jain', 'Keto', 'Low Sugar']

const STORAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/seller-media`

export default function BrowsePage() {
  const navigate = useNavigate()
  const { consumer, role } = useAuth()
  const [sellers, setSellers] = useState<SellerCard[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [showLocationInput, setShowLocationInput] = useState(false)
  const [sellerType, setSellerType] = useState<'all' | 'baker' | 'home_cook'>('all')
  const [cuisineFilter, setCuisineFilter] = useState<string[]>([])
  const [dietaryFilter, setDietaryFilter] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [browseBanners, setBrowseBanners] = useState<BoostBanner[]>([])
  const [bannerIdx, setBannerIdx] = useState(0)
  const [splash, setSplash] = useState<BoostBanner | null>(null)
  const [splashDismissed, setSplashDismissed] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadSellers()
  }, [sellerType, cuisineFilter, dietaryFilter, locationFilter])

  useEffect(() => {
    loadBoosts()
  }, [])

  useEffect(() => {
    if (consumer?.id) loadSaves()
  }, [consumer?.id])

  useEffect(() => {
    if (browseBanners.length <= 1) return
    const interval = setInterval(() => setBannerIdx(i => (i + 1) % browseBanners.length), 5000)
    return () => clearInterval(interval)
  }, [browseBanners])

  async function loadBoosts() {
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('offer_boosts')
      .select('id, boost_type, offers(id, title, body, photo_urls), sellers(id, display_name, avatar_url)')
      .eq('payment_status', 'paid')
      .lte('starts_at', now)
      .gt('ends_at', now)
    if (!data) return
    const banners = data.filter((b: any) => b.boost_type === 'browse_banner') as BoostBanner[]
    const splashes = data.filter((b: any) => b.boost_type === 'splash') as BoostBanner[]
    setBrowseBanners(banners)
    if (splashes.length > 0 && !sessionStorage.getItem('splash_shown')) {
      setSplash(splashes[Math.floor(Math.random() * splashes.length)])
    }
  }

  async function loadSaves() {
    if (!consumer) return
    try {
      const { data } = await supabase.from('saves').select('seller_id').eq('consumer_id', consumer.id)
      setSavedIds(new Set((data ?? []).map((s: any) => s.seller_id)))
    } catch { /* non-fatal */ }
  }

  async function toggleSave(e: React.MouseEvent, sellerId: string) {
    e.stopPropagation()
    if (!consumer) return
    if (savedIds.has(sellerId)) {
      await supabase.from('saves').delete().eq('consumer_id', consumer.id).eq('seller_id', sellerId)
      setSavedIds(prev => { const n = new Set(prev); n.delete(sellerId); return n })
    } else {
      await supabase.from('saves').insert({ consumer_id: consumer.id, seller_id: sellerId })
      setSavedIds(prev => new Set([...prev, sellerId]))
    }
  }

  function dismissSplash() {
    sessionStorage.setItem('splash_shown', '1')
    setSplashDismissed(true)
  }

  async function loadSellers() {
    setLoading(true)
    try {
      const { data } = await browseSellers({
        sellerType: sellerType === 'all' ? undefined : sellerType,
        cuisineTags: cuisineFilter.length > 0 ? cuisineFilter : undefined,
        dietaryTags: dietaryFilter.length > 0 ? dietaryFilter : undefined,
        searchQuery: search || undefined,
        locationQuery: locationFilter || undefined,
      })

      if (data) {
        const enriched = (data as any[]).map(s => {
          const reviews = s.reviews ?? []
          const avg = reviews.length > 0
            ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
            : null
          return { ...s, avg_rating: avg ? Math.round(avg * 10) / 10 : null, review_count: reviews.length }
        })
        setSellers(enriched)
      }
    } finally {
      setLoading(false)
    }
  }

  function toggleTag(arr: string[], val: string, setter: (v: string[]) => void) {
    setter(arr.includes(val) ? arr.filter(t => t !== val) : [...arr, val])
  }

  const filtered = search
    ? sellers.filter(s => s.display_name.toLowerCase().includes(search.toLowerCase()))
    : sellers

  return (
    <div className="browse-page">

      {/* Splash overlay */}
      {splash && !splashDismissed && (
        <div className="splash-overlay">
          <div className="splash-card">
            <button className="splash-close" onClick={dismissSplash}>✕</button>
            {splash.offers.photo_urls?.[0] && (
              <img src={`${STORAGE_URL}/${splash.offers.photo_urls[0]}`} alt={splash.offers.title} className="splash-img" />
            )}
            <div className="splash-body">
              <div className="splash-header-row">
                <div className="splash-logo">
                  {splash.sellers.avatar_url
                    ? <img src={`${STORAGE_URL}/${splash.sellers.avatar_url}`} alt="" />
                    : <span>{splash.sellers.display_name.charAt(0)}</span>
                  }
                </div>
                <p className="splash-seller">{splash.sellers.display_name}</p>
              </div>
              <h2 className="splash-title">{splash.offers.title}</h2>
              {splash.offers.body && <p className="splash-text">{splash.offers.body}</p>}
              <div className="splash-actions">
                <button className="splash-cta" onClick={() => { dismissSplash(); navigate(`/seller/${splash.sellers.id}`) }}>View offer</button>
                <button className="splash-skip" onClick={dismissSplash}>Maybe later</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top bar: location + profile */}
      <div className="browse-topbar">
        <button className="location-btn" onClick={() => setShowLocationInput(v => !v)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {locationFilter || 'Bangalore'}
        </button>

        {role === 'consumer' && (
          <button className="profile-avatar-btn" onClick={() => navigate('/consumer/profile')}>
            {consumer?.display_name?.charAt(0)?.toUpperCase() ?? '?'}
          </button>
        )}
      </div>

      {showLocationInput && (
        <div className="location-input-row">
          <input
            autoFocus
            type="text"
            placeholder="Filter by neighbourhood (e.g. Indiranagar)"
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') setShowLocationInput(false)
              if (e.key === 'Escape') { setLocationFilter(''); setShowLocationInput(false) }
            }}
          />
          {locationFilter && (
            <button className="location-clear-btn" onClick={() => { setLocationFilter(''); setShowLocationInput(false) }}>✕</button>
          )}
        </div>
      )}

      {/* Browse banners */}
      {browseBanners.length > 0 && (
        <div className="browse-banner-wrap" onClick={() => navigate(`/seller/${browseBanners[bannerIdx].sellers.id}`)}>
          {browseBanners[bannerIdx].offers.photo_urls?.[0] && (
            <img src={`${STORAGE_URL}/${browseBanners[bannerIdx].offers.photo_urls[0]}`} alt="" className="browse-banner-img" />
          )}
          <div className="browse-banner-logo">
            {browseBanners[bannerIdx].sellers.avatar_url
              ? <img src={`${STORAGE_URL}/${browseBanners[bannerIdx].sellers.avatar_url}`} alt="" />
              : <span>{browseBanners[bannerIdx].sellers.display_name.charAt(0)}</span>
            }
          </div>
          <div className="browse-banner-content">
            <span className="browse-banner-seller">{browseBanners[bannerIdx].sellers.display_name}</span>
            <span className="browse-banner-title">{browseBanners[bannerIdx].offers.title}</span>
          </div>
          {browseBanners.length > 1 && (
            <div className="browse-banner-dots">
              {browseBanners.map((_, i) => <span key={i} className={`banner-dot ${i === bannerIdx ? 'active' : ''}`} />)}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="browse-search-row">
        <div className="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadSellers()}
          />
        </div>
        <button className="filter-toggle-btn" onClick={() => setShowFilters(!showFilters)}>
          ⚙ Filters {(cuisineFilter.length + dietaryFilter.length) > 0 && `(${cuisineFilter.length + dietaryFilter.length})`}
        </button>
      </div>

      {/* Type toggle */}
      <div className="type-toggle">
        {(['all', 'baker', 'home_cook'] as const).map(t => (
          <button
            key={t}
            className={`type-btn ${sellerType === t ? 'active' : ''}`}
            onClick={() => setSellerType(t)}
          >
            {t === 'all' ? 'All' : t === 'baker' ? 'Bakers' : 'Home Cooks'}
          </button>
        ))}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <h3>What are you craving?</h3>
            <div className="filter-tags">
              {CUISINE_OPTIONS.map(tag => (
                <button
                  key={tag}
                  className={`filter-tag ${cuisineFilter.includes(tag) ? 'selected' : ''}`}
                  onClick={() => toggleTag(cuisineFilter, tag, setCuisineFilter)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <h3>Dietary preferences</h3>
            <div className="filter-tags">
              {DIETARY_OPTIONS.map(tag => (
                <button
                  key={tag}
                  className={`filter-tag ${dietaryFilter.includes(tag) ? 'selected' : ''}`}
                  onClick={() => toggleTag(dietaryFilter, tag, setDietaryFilter)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          {(cuisineFilter.length > 0 || dietaryFilter.length > 0) && (
            <button className="clear-filters" onClick={() => { setCuisineFilter([]); setDietaryFilter([]) }}>
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="browse-loading">Finding kitchens near you…</div>
      ) : filtered.length === 0 ? (
        <div className="browse-empty">
          <p>No kitchens found matching your filters.</p>
          <button onClick={() => { setCuisineFilter([]); setDietaryFilter([]); setSearch(''); setLocationFilter('') }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="seller-grid">
          {filtered.map(seller => (
            <SellerCard key={seller.id} seller={seller} saved={savedIds.has(seller.id)} onSave={e => toggleSave(e, seller.id)} onClick={() => navigate(`/seller/${seller.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}

function SellerCard({ seller, saved, onSave, onClick }: { seller: SellerCard; saved: boolean; onSave: (e: React.MouseEvent) => void; onClick: () => void }) {
  const coverUrl = seller.cover_photo_url ? `${STORAGE_URL}/${seller.cover_photo_url}` : null
  const avatarUrl = seller.avatar_url ? `${STORAGE_URL}/${seller.avatar_url}` : null

  return (
    <div className="seller-card" onClick={onClick}>
      <div className="card-cover">
        {coverUrl
          ? <img src={coverUrl} alt={seller.display_name} className="card-cover-img" />
          : <div className="card-cover-placeholder" />
        }
        {seller.is_featured && <span className="featured-badge">Featured</span>}
        <span className={`type-badge ${seller.seller_type}`}>
          {seller.seller_type === 'home_cook' ? 'Home Cook' : 'Baker'}
        </span>
        <button className={`card-save-btn ${saved ? 'saved' : ''}`} onClick={onSave} aria-label={saved ? 'Unsave' : 'Save'}>
          {saved ? '♥' : '♡'}
        </button>
      </div>

      <div className="card-avatar">
        {avatarUrl
          ? <img src={avatarUrl} alt={seller.display_name} />
          : <span>{seller.display_name.charAt(0)}</span>
        }
      </div>

      <div className="card-info">
        <h3 className="card-name">{seller.display_name}</h3>

        <div className="card-location">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {seller.location_text ?? 'Bangalore'}
        </div>

        {seller.bio && <p className="card-bio">{seller.bio}</p>}

        <div className="card-tags">
          {seller.cuisine_tags?.slice(0, 3).map(t => (
            <span key={t} className="card-tag">{t}</span>
          ))}
          {seller.dietary_tags?.slice(0, 2).map(t => (
            <span key={t} className="card-tag dietary">{t}</span>
          ))}
        </div>

        <div className="card-footer">
          {seller.avg_rating && (
            <span className="card-rating">
              <span className="star">★</span> {seller.avg_rating} ({seller.review_count})
            </span>
          )}
          {seller.fssai_status === 'verified' && (
            <span className="fssai-badge">✓ FSSAI</span>
          )}
        </div>
      </div>
    </div>
  )
}
