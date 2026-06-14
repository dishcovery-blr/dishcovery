import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { browseSellers } from '../../lib/supabase'
import type { SellerCard } from '../../types/database'

const CUISINE_OPTIONS = [
  'Cakes & Pastries', 'Bread & Loaves', 'Cookies', 'Chocolates',
  'South Indian', 'North Indian', 'Biryani', 'Snacks', 'Healthy & Diet',
  'Desserts', 'Continental', 'Beverages',
]

const DIETARY_OPTIONS = ['Eggless', 'Vegan', 'Gluten-Free', 'Jain', 'Keto', 'Low Sugar']

export default function BrowsePage() {
  const navigate = useNavigate()
  const [sellers, setSellers] = useState<SellerCard[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sellerType, setSellerType] = useState<'all' | 'baker' | 'home_cook'>('all')
  const [cuisineFilter, setCuisineFilter] = useState<string[]>([])
  const [dietaryFilter, setDietaryFilter] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadSellers()
  }, [sellerType, cuisineFilter, dietaryFilter])

  async function loadSellers() {
    setLoading(true)
    const { data } = await browseSellers({
      sellerType: sellerType === 'all' ? undefined : sellerType,
      cuisineTags: cuisineFilter.length > 0 ? cuisineFilter : undefined,
      dietaryTags: dietaryFilter.length > 0 ? dietaryFilter : undefined,
      searchQuery: search || undefined,
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
    setLoading(false)
  }

  function toggleTag(arr: string[], val: string, setter: (v: string[]) => void) {
    setter(arr.includes(val) ? arr.filter(t => t !== val) : [...arr, val])
  }

  const filtered = search
    ? sellers.filter(s => s.display_name.toLowerCase().includes(search.toLowerCase()))
    : sellers

  return (
    <div className="browse-page">
      <div className="browse-header">
        <h1 className="browse-title">Discover home kitchens near you</h1>
        <p className="browse-subtitle">Home bakers, cooks, and cloud kitchens near you</p>
      </div>

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
          <button onClick={() => { setCuisineFilter([]); setDietaryFilter([]); setSearch('') }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="seller-grid">
          {filtered.map(seller => (
            <SellerCard key={seller.id} seller={seller} onClick={() => navigate(`/seller/${seller.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}

function SellerCard({ seller, onClick }: { seller: SellerCard; onClick: () => void }) {
  function stars(n: number) {
    return '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n))
  }

  return (
    <div className="seller-card" onClick={onClick}>
      {/* Cover */}
      <div className="card-cover">
        {seller.cover_photo_url
          ? <img src={seller.cover_photo_url} alt={seller.display_name} className="card-cover-img" />
          : <div className="card-cover-placeholder" />
        }
        {seller.is_featured && <span className="featured-badge">Featured</span>}
        <span className={`type-badge ${seller.seller_type}`}>
          {seller.seller_type === 'home_cook' ? 'Home Cook' : 'Baker'}
        </span>
      </div>

      {/* Avatar */}
      <div className="card-avatar">
        {seller.avatar_url
          ? <img src={seller.avatar_url} alt={seller.display_name} />
          : <span>{seller.display_name.charAt(0)}</span>
        }
      </div>

      {/* Info */}
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
