import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
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

  async function loadProfile(currentUser: User) {
    const userRole = getUserRole(currentUser) as UserRole
    setRole(userRole)

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
      setConsumer(data)
    }
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setSeller(null)
        setConsumer(null)
        if (session?.user) {
          await loadProfile(session.user)
        }
      }
    )

    return () => subscription.unsubscribe()
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
