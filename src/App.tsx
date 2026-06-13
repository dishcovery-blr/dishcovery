import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import SellerOnboarding from './pages/seller/SellerOnboarding'
import AdminSellerApproval from './pages/admin/AdminSellerApproval'

function RootRedirect() {
  const { user, role, loading } = useAuth()
  if (loading) return <div>Loading…</div>
  if (!user) return <div>Welcome to Dishcovery — <a href="/seller/onboarding">Register as a seller</a></div>
  if (role === 'admin') return <Navigate to="/admin/sellers" replace />
  if (role === 'seller') return <Navigate to="/seller/onboarding" replace />
  return <div>Welcome</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/seller/onboarding" element={<SellerOnboarding />} />
          <Route path="/admin/sellers" element={<AdminSellerApproval />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}