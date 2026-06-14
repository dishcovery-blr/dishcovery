import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { signOut } from '../lib/supabase'

export default function Navbar() {
  const { user, role, seller } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  if (['/login', '/signup', '/seller/onboarding'].includes(location.pathname)) return null

  async function handleSignOut() {
    await signOut()
    navigate('/browse')
  }

  return (
    <nav className="navbar">
      <button className="navbar-logo" onClick={() => navigate(role === 'admin' ? '/admin' : role === 'seller' ? '/seller/dashboard' : '/browse')}>
        <img src="/logo.png" alt="Dishcovery" className="navbar-logo-img" />
      </button>

      <div className="navbar-right">
        {!user ? (
          <>
            <button className="navbar-link" onClick={() => navigate('/browse')}>Browse</button>
            <button className="navbar-btn-outline" onClick={() => navigate('/login')}>Sign in</button>
            <button className="navbar-btn" onClick={() => navigate('/signup')}>List your kitchen</button>
          </>
        ) : role === 'admin' ? (
          <>
            <button className="navbar-link" onClick={() => navigate('/admin')}>Overview</button>
            <button className="navbar-link" onClick={() => navigate('/admin/sellers')}>Sellers</button>
            <button className="navbar-link" onClick={() => navigate('/admin/fssai')}>FSSAI</button>
            <button className="navbar-link" onClick={() => navigate('/admin/consumers')}>Consumers</button>
            <button className="navbar-btn-outline" onClick={handleSignOut}>Sign out</button>
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
