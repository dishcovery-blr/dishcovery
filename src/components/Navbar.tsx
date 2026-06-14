import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { signOut } from '../lib/supabase'

export default function Navbar() {
  const { user, role, seller } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Hide navbar on auth pages
  if (['/login', '/signup'].includes(location.pathname)) return null
  // Hide on seller onboarding
  if (location.pathname === '/seller/onboarding') return null

  async function handleSignOut() {
    await signOut()
    navigate('/browse')
  }

  return (
    <nav className="navbar">
      <button className="navbar-logo" onClick={() => navigate('/browse')}>
        🍽 Dishcovery
      </button>

      <div className="navbar-right">
        {!user ? (
          <>
            <button className="navbar-link" onClick={() => navigate('/browse')}>Browse</button>
            <button className="navbar-btn-outline" onClick={() => navigate('/login')}>Sign in</button>
            <button className="navbar-btn" onClick={() => navigate('/signup')}>List your kitchen</button>
          </>
        ) : role === 'seller' ? (
          <>
            <button className="navbar-link" onClick={() => navigate('/seller/dashboard')}>Dashboard</button>
            <button className="navbar-link" onClick={() => navigate('/browse')}>Browse</button>
            {seller && (
              <a className="navbar-link" href={`/seller/${seller.id}`} target="_blank" rel="noopener noreferrer">
                My listing ↗
              </a>
            )}
            <button className="navbar-btn-outline" onClick={handleSignOut}>Sign out</button>
          </>
        ) : role === 'admin' ? (
          <>
            <button className="navbar-link" onClick={() => navigate('/admin/sellers')}>Admin</button>
            <button className="navbar-btn-outline" onClick={handleSignOut}>Sign out</button>
          </>
        ) : (
          <>
            <button className="navbar-link" onClick={() => navigate('/browse')}>Browse</button>
            <button className="navbar-btn-outline" onClick={handleSignOut}>Sign out</button>
          </>
        )}
      </div>
    </nav>
  )
}
