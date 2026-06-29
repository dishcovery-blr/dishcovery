import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, getUserRole } from '../lib/supabase'
import type { Seller, Consumer } from '../types/database'

type UserRole = 'seller' | 'consumer' | 'admin' | null

interface AuthContextValue {
  user: User | null
  session: Session | null
  role: UserRole
  seller: Seller | null
  consumer: Consumer | null
  loading: boolean
  refreshSeller: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  role: null,
  seller: null,
  consumer: null,
  loading: true,
  refreshSeller: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole>(null)
  const [seller, setSeller] = useState<Seller | null>(null)
  const [consumer, setConsumer] = useState<Consumer | null>(null)
  const [loading, setLoading] = useState(true)
  const currentUserRef = useRef<string | null>(null)

  async function loadProfile(currentUser: User) {
    currentUserRef.current = currentUser.id
    let userRole = getUserRole(currentUser) as UserRole

    // Fallback: metadata missing or wrong — check DB directly
    if (!userRole || (userRole !== 'seller' && userRole !== 'consumer' && userRole !== 'admin')) {
      const [{ data: sellerRow }, { data: consumerRow }] = await Promise.all([
        supabase.from('sellers').select('id').eq('auth_user_id', currentUser.id).maybeSingle(),
        supabase.from('consumers').select('id').eq('auth_user_id', currentUser.id).maybeSingle(),
      ])
      if (sellerRow) userRole = 'seller'
      else if (consumerRow) userRole = 'consumer'
    }

    setRole(userRole)

    if (userRole === 'admin') {
      setLoading(false)
      return
    }

    if (userRole === 'seller') {
      const { data } = await supabase
        .from('sellers')
        .select('*')
        .eq('auth_user_id', currentUser.id)
        .single()
      setSeller(data)
    } else if (userRole === 'consumer') {
      const { data } = await supabase
        .from('consumers')
        .select('*')
        .eq('auth_user_id', currentUser.id)
        .single()
      if (data) {
        setConsumer(data)
      } else {
        const display_name =
          currentUser.user_metadata?.display_name ||
          currentUser.email?.split('@')[0] ||
          'User'
        await supabase.from('consumers').insert({ auth_user_id: currentUser.id, display_name })
        const { data: created } = await supabase
          .from('consumers')
          .select('*')
          .eq('auth_user_id', currentUser.id)
          .single()
        setConsumer(created)
      }
    }

    setLoading(false)
  }

  async function refreshSeller() {
    if (!user) return
    const { data } = await supabase
      .from('sellers')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()
    setSeller(data)
  }

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 5000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout)
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // INITIAL_SESSION is already handled by getSession() above — skip it to avoid
        // two concurrent loadProfile calls racing each other on every page load.
        if (event === 'INITIAL_SESSION') return

        setSession(session)
        setUser(session?.user ?? null)

        if (event === 'SIGNED_OUT' || !session?.user) {
          setSeller(null)
          setConsumer(null)
          setRole(null)
          setLoading(false)
          return
        }

        if (event === 'SIGNED_IN') {
          // Skip re-loading profile if it's the same user already in context (e.g. token
          // refresh or repeated SIGNED_IN event) — avoids full-page loading flash on navigation.
          if (currentUserRef.current === session.user.id) return
          setLoading(true)
          await loadProfile(session.user)
        }
        // TOKEN_REFRESHED / USER_UPDATED: session refs updated above, profile unchanged
      }
    )

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, role, seller, consumer, loading, refreshSeller }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function useRequireAuth(redirectTo = '/login') {
  const { user, loading } = useAuth()
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = redirectTo
    }
  }, [user, loading, redirectTo])
  return { user, loading }
}

export function useRequireSeller() {
  const { seller, role, loading } = useAuth()
  useEffect(() => {
    if (!loading && role !== 'seller') {
      window.location.href = '/login'
    }
    if (!loading && seller && seller.subscription_end) {
      const expired = new Date(seller.subscription_end) < new Date()
      if (expired) {
        window.location.href = '/seller/subscribe'
      }
    }
  }, [seller, role, loading])
  return { seller, loading }
}