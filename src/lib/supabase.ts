import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Auth helpers ────────────────────────────────────────────────

export async function signUpSeller(
  email: string,
  password: string,
  sellerType: 'baker' | 'home_cook',
  displayName: string
) {
  const result = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role: 'seller', seller_type: sellerType, display_name: displayName },
    },
  })
  if (!result.error) {
    await supabase.functions.invoke('send-email', {
      body: {
        to: email,
        subject: 'Welcome to Dishcovery!',
        html: `<p>Hi ${displayName},</p>
<p>Thanks for registering on Dishcovery. We've received your details and our team will review and approve your profile shortly.</p>
<p>In the meantime, you can log in and start building your profile — add photos, set up your menu, and get ready to go live.</p>
<p>We'll send you another email once you're approved.</p>
<p>— The Dishcovery Team</p>`,
      },
    })
  }
  return result
}

export async function signUpConsumer(
  email: string,
  password: string,
  displayName: string
) {
  const result = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role: 'consumer', display_name: displayName },
    },
  })
  if (!result.error) {
    await supabase.functions.invoke('send-email', {
      body: {
        to: email,
        subject: 'Welcome to Dishcovery!',
        html: `<p>Hi ${displayName},</p>
<p>Welcome to Dishcovery! You're all set.</p>
<p>Discover the best home bakers and cooks near you, browse menus, check out their work, and order directly on WhatsApp.</p>
<p><a href="https://dishcovery.in">Start exploring →</a></p>
<p>— The Dishcovery Team</p>`,
      },
    })
  }
  return result
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export function getUserRole(user: { user_metadata?: Record<string, unknown> } | null): string | null {
  return (user?.user_metadata?.role as string) ?? null
}

// ── Seller helpers ──────────────────────────────────────────────

export async function createSellerProfile(data: {
  auth_user_id: string
  seller_type: 'baker' | 'home_cook'
  display_name: string
  whatsapp_number: string
  location_text?: string
  lat?: number
  lng?: number
}) {
  return supabase.from('sellers').insert(data).select().single()
}

export async function getMySellerProfile() {
  return supabase
    .from('sellers')
    .select('*')
    .eq('auth_user_id', (await getCurrentUser())?.id)
    .single()
}

export async function updateSellerProfile(
  sellerId: string,
  updates: Record<string, unknown>
) {
  return supabase
    .from('sellers')
    .update(updates)
    .eq('id', sellerId)
    .select()
    .single()
}

export async function getSellerById(sellerId: string) {
  return supabase
    .from('sellers')
    .select(`
      *,
      menu_categories (*, menu_items (*)),
      offers (*, is_active.eq(true)),
      seller_photos (*),
      reviews (*)
    `)
    .eq('id', sellerId)
    .eq('status', 'approved')
    .single()
}

// ── Consumer helpers ────────────────────────────────────────────

export async function getMyConsumerProfile() {
  return supabase
    .from('consumers')
    .select('*')
    .eq('auth_user_id', (await getCurrentUser())?.id)
    .single()
}

// ── Browse helpers ──────────────────────────────────────────────

export async function browseSellers({
  sellerType,
  cuisineTags,
  dietaryTags,
  searchQuery,
  locationQuery,
  featuredOnly = false,
  page = 0,
  pageSize = 20,
}: {
  sellerType?: 'baker' | 'home_cook'
  cuisineTags?: string[]
  dietaryTags?: string[]
  searchQuery?: string
  locationQuery?: string
  featuredOnly?: boolean
  page?: number
  pageSize?: number
}) {
  let query = supabase
    .from('sellers')
    .select(`
      id, display_name, seller_type, bio, avatar_url, cover_photo_url,
      location_text, cuisine_tags, dietary_tags, fssai_status,
      whatsapp_number, is_featured,
      reviews (rating)
    `)
    .eq('status', 'approved')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (sellerType) query = query.eq('seller_type', sellerType)
  if (featuredOnly) query = query.eq('is_featured', true)
  if (cuisineTags?.length) query = query.overlaps('cuisine_tags', cuisineTags)
  if (dietaryTags?.length) query = query.overlaps('dietary_tags', dietaryTags)
  if (searchQuery) query = query.ilike('display_name', `%${searchQuery}%`)
  if (locationQuery) query = query.ilike('location_text', `%${locationQuery}%`)

  return query
}

// ── Offers helpers ──────────────────────────────────────────────

export async function getActiveOffers(sellerId: string) {
  return supabase
    .from('offers')
    .select('*')
    .eq('seller_id', sellerId)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
}

export async function createOffer(offer: {
  seller_id: string
  title: string
  body?: string
  photo_urls?: string[]
  expires_at: string
}) {
  return supabase.from('offers').insert(offer).select().single()
}

export async function deleteOffer(offerId: string) {
  return supabase.from('offers').delete().eq('id', offerId)
}

// ── Boost orders ───────────────────────────────────────────────
// Razorpay slot: when GST is registered, replace this function body with
// a Razorpay order creation call, store razorpay_order_id, and set
// payment_status based on the payment response / webhook.
export async function createBoostOrder(params: {
  offerId: string
  sellerId: string
  boostType: 'browse_banner' | 'splash'
  daysPurchased: number
  amountPaise: number
}) {
  return supabase
    .from('offer_boosts')
    .insert({
      offer_id: params.offerId,
      seller_id: params.sellerId,
      boost_type: params.boostType,
      days_purchased: params.daysPurchased,
      amount_paise: params.amountPaise,
      payment_status: 'pending',
    })
    .select()
    .single()
}

// ── Analytics ──────────────────────────────────────────────────

export async function trackProfileView(sellerId: string) {
  return supabase.rpc('increment_profile_view', { seller_uuid: sellerId })
}

export async function trackWhatsappTap(sellerId: string) {
  return supabase.rpc('increment_whatsapp_tap', { seller_uuid: sellerId })
}

// ── Subscription check ─────────────────────────────────────────

export async function getSubscriptionStatus(sellerId: string) {
  return supabase
    .from('subscriptions')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
}

export function isSubscriptionActive(subscriptionEnd: string | null): boolean {
  if (!subscriptionEnd) return false
  return new Date(subscriptionEnd) > new Date()
}
