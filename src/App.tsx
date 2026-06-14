import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import BrowsePage from './pages/consumer/BrowsePage'
import SellerProfilePage from './pages/consumer/SellerProfilePage'
import SellerOnboarding from './pages/seller/SellerOnboarding'
import SellerDashboard from './pages/seller/SellerDashboard'
import SellerProfileEdit from './pages/seller/SellerProfileEdit'
import SellerGallery from './pages/seller/SellerGallery'
import SellerMenuEdit from './pages/seller/SellerMenuEdit'
import SellerOffers from './pages/seller/SellerOffers'
import AdminSellerApproval from './pages/admin/AdminSellerApproval'
import './dishcovery.css'

function RootRedirect() {
  const { user, role, seller, loading } = useAuth()
  if (loading) return <div className="page-loading">Loading…</div>
  if (!user) return <Navigate to="/browse" replace />
  if (role === 'admin') return <Navigate to="/admin/sellers" replace />
  if (role === 'seller') {
    if (!seller) return <Navigate to="/seller/onboarding" replace />
    return <Navigate to="/seller/dashboard" replace />
  }
  return <Navigate to="/browse" replace />
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/browse" element={<BrowsePage />} />
        {/* Specific seller routes BEFORE the :sellerId wildcard */}
        <Route path="/seller/onboarding" element={<SellerOnboarding />} />
        <Route path="/seller/dashboard" element={<SellerDashboard />} />
        <Route path="/seller/profile" element={<SellerProfileEdit />} />
        <Route path="/seller/gallery" element={<SellerGallery />} />
        <Route path="/seller/menu" element={<SellerMenuEdit />} />
        <Route path="/seller/offers" element={<SellerOffers />} />
        {/* Public seller profile - MUST be last seller route */}
        <Route path="/seller/:sellerId" element={<SellerProfilePage />} />
        <Route path="/admin/sellers" element={<AdminSellerApproval />} />
        <Route path="*" element={<Navigate to="/browse" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
