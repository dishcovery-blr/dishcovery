import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import SellerOnboarding from './pages/seller/SellerOnboarding'
import AdminSellerApproval from './pages/admin/AdminSellerApproval'
import BrowsePage from './pages/consumer/BrowsePage'
import SellerProfilePage from './pages/consumer/SellerProfilePage'
import './dishcovery.css'

function RootRedirect() {
  const { user, role, loading } = useAuth()
  if (loading) return <div className="page-loading">Loading…</div>
  if (!user) return <Navigate to="/browse" replace />
  if (role === 'admin') return <Navigate to="/admin/sellers" replace />
  if (role === 'seller') return <Navigate to="/seller/onboarding" replace />
  return <Navigate to="/browse" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/seller/:sellerId" element={<SellerProfilePage />} />
          <Route path="/seller/onboarding" element={<SellerOnboarding />} />
          <Route path="/admin/sellers" element={<AdminSellerApproval />} />
          <Route path="*" element={<Navigate to="/browse" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
