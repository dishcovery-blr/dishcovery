export type SellerType = 'baker' | 'home_cook'
export type SellerStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type FssaiStatus = 'not_submitted' | 'in_progress' | 'verified' | 'expired'
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled'
export type PlanTier = 'basic' | 'standard' | 'premium' | 'home_cook'
export type PhotoType = 'cover' | 'gallery' | 'video_thumbnail'

export interface Seller {
  id: string
  auth_user_id: string
  seller_type: SellerType
  status: SellerStatus
  display_name: string
  bio: string | null
  avatar_url: string | null
  cover_photo_url: string | null
  whatsapp_number: string
  phone_number: string | null
  instagram_url: string | null
  email: string | null
  location_text: string | null
  lat: number | null
  lng: number | null
  delivery_radius_km: number
  cuisine_tags: string[]
  dietary_tags: string[]
  accepts_custom_orders: boolean
  operating_hours: string | null
  fssai_number: string | null
  fssai_status: FssaiStatus
  fssai_grace_deadline: string | null
  subscription_end: string | null
  profile_views: number
  whatsapp_taps: number
  team_bio: string | null
  group_photo_url: string | null
  is_featured: boolean
  created_at: string
  updated_at: string
}

export interface MenuCategory {
  id: string
  seller_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface MenuItem {
  id: string
  seller_id: string
  category_id: string | null
  name: string
  description: string | null
  price: number
  photo_url: string | null
  is_available: boolean
  is_veg: boolean
  dietary_flags: string[]
  flavour: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Offer {
  id: string
  seller_id: string
  title: string
  body: string | null
  photo_urls: string[]
  expires_at: string
  is_active: boolean
  created_at: string
}

export interface SellerPhoto {
  id: string
  seller_id: string
  storage_path: string
  photo_type: PhotoType
  caption: string | null
  sort_order: number
  created_at: string
}

export interface Consumer {
  id: string
  auth_user_id: string
  display_name: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  seller_id: string
  consumer_id: string
  rating: number
  body: string | null
  seller_reply: string | null
  created_at: string
}

export type BoostType = 'browse_banner' | 'splash'
export type BoostPaymentStatus = 'pending' | 'paid' | 'cancelled'

export interface OfferBoost {
  id: string
  offer_id: string
  seller_id: string
  boost_type: BoostType
  days_purchased: number
  amount_paise: number
  payment_status: BoostPaymentStatus
  starts_at: string | null
  ends_at: string | null
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  created_at: string
  updated_at: string
}

export interface Save {
  seller_id: string
  consumer_id: string
  saved_at: string
}

export interface Subscription {
  id: string
  seller_id: string
  plan_tier: PlanTier
  status: SubscriptionStatus
  starts_at: string
  ends_at: string
  razorpay_sub_id: string | null
  razorpay_order_id: string | null
  amount_paise: number | null
  created_at: string
  updated_at: string
}

export interface FssaiDocument {
  id: string
  seller_id: string
  storage_path: string
  submission_status: FssaiStatus
  submitted_at: string
  verified_at: string | null
  admin_notes: string | null
  created_at: string
}

export type VendorAdType = 'listing' | 'banner' | 'splash'
export type VendorCtaType = 'url' | 'whatsapp'
export type VendorAdPaymentStatus = 'pending' | 'paid'

export interface Vendor {
  id: string
  auth_user_id: string
  company_name: string
  contact_name: string
  whatsapp_number: string | null
  website_url: string | null
  created_at: string
}

export interface VendorAd {
  id: string
  vendor_id: string
  title: string
  body: string | null
  photo_url: string | null
  ad_type: VendorAdType
  cta_type: VendorCtaType
  cta_value: string
  is_active: boolean
  created_at: string
}

export interface VendorAdBoost {
  id: string
  ad_id: string
  vendor_id: string
  days_purchased: number
  amount_paise: number
  payment_status: VendorAdPaymentStatus
  starts_at: string | null
  ends_at: string | null
  created_at: string
}

// Enriched types for UI use
export interface SellerWithDetails extends Seller {
  menu_categories?: MenuCategory[]
  menu_items?: MenuItem[]
  offers?: Offer[]
  seller_photos?: SellerPhoto[]
  reviews?: Review[]
  avg_rating?: number
  review_count?: number
}

export interface SellerCard {
  id: string
  display_name: string
  seller_type: SellerType
  bio: string | null
  avatar_url: string | null
  cover_photo_url: string | null
  location_text: string | null
  cuisine_tags: string[]
  dietary_tags: string[]
  fssai_status: FssaiStatus
  whatsapp_number: string
  is_featured: boolean
  avg_rating?: number
  review_count?: number
  active_offer_count?: number
}
