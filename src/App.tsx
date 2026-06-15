import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
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
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminSellers from './pages/admin/AdminSellers'
import AdminFssai from './pages/admin/AdminFssai'
import AdminConsumers from './pages/admin/AdminConsumers'
import './dishcovery.css'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import TermsPage from './pages/TermsPage'

function RootRedirect() {
  const { user, role, seller, loading } = useAuth()
  if (loading) return <div className="page-loading">Loading…</div>
  if (!user) return <Navigate to="/" replace />
  if (role === 'admin') return <Navigate to="/admin" replace />
  if (role === 'seller') {
    if (!seller) return <Navigate to="/seller/onboarding" replace />
    return <Navigate to="/seller/dashboard" replace />
  }
  return <Navigate to="/browse" replace />
}

function AppRoutes() {
  const { user, loading } = useAuth()

  return (
    <>
      <Navbar />
      <Routes>
        {/* Landing page loads instantly - no auth wait */}
        <Route path="/" element={!user && !loading ? <LandingPage /> : user ? <RootRedirect /> : <LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/browse" element={user ? <BrowsePage /> : <Navigate to="/" replace />} />
        <Route path="/seller/onboarding" element={user ? <SellerOnboarding /> : <Navigate to="/" replace />} />
        <Route path="/seller/dashboard" element={user ? <SellerDashboard /> : <Navigate to="/" replace />} />
        <Route path="/seller/profile" element={user ? <SellerProfileEdit /> : <Navigate to="/" replace />} />
        <Route path="/seller/gallery" element={user ? <SellerGallery /> : <Navigate to="/" replace />} />
        <Route path="/seller/menu" element={user ? <SellerMenuEdit /> : <Navigate to="/" replace />} />
        <Route path="/seller/offers" element={user ? <SellerOffers /> : <Navigate to="/" replace />} />
        <Route path="/seller/:sellerId" element={user ? <SellerProfilePage /> : <Navigate to="/" replace />} />
        <Route path="/admin" element={user ? <AdminDashboard /> : <Navigate to="/" replace />} />
        <Route path="/admin/sellers" element={user ? <AdminSellers /> : <Navigate to="/" replace />} />
        <Route path="/admin/fssai" element={user ? <AdminFssai /> : <Navigate to="/" replace />} />
        <Route path="/admin/consumers" element={user ? <AdminConsumers /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
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