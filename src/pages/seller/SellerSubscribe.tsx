import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const PLANS = [
  { id: '3m',  label: '3 months',  months: 3,  days: 90,  price: 2499,  perMonth: 833,  badge: null },
  { id: '6m',  label: '6 months',  months: 6,  days: 180, price: 4499,  perMonth: 750,  badge: 'Popular' },
  { id: '12m', label: '1 year',    months: 12, days: 365, price: 7999,  perMonth: 667,  badge: 'Best value' },
  { id: '24m', label: '2 years',   months: 24, days: 730, price: 13999, perMonth: 583,  badge: null },
]

export default function SellerSubscribe() {
  const { seller, loading } = useAuth()
  const navigate = useNavigate()
  const [selectedPlan, setSelectedPlan] = useState(PLANS[1]) // default: 6 months

  if (loading) return <div className="page-loading">Loading…</div>
  if (!seller) return <Navigate to="/login" replace />

  const subEnd = seller.subscription_end ? new Date(seller.subscription_end) : null
  const isExpired = !subEnd || subEnd < new Date()
  const daysLeft = subEnd
    ? Math.max(0, Math.ceil((subEnd.getTime() - Date.now()) / 86400000))
    : 0
  const refCode = `SUB-${seller.id.slice(0, 8).toUpperCase()}`

  return (
    <div className="subscribe-page">
      <div className="subscribe-header">
        <button className="back-btn" onClick={() => navigate('/seller/dashboard')}>← Back</button>
        <h1>Subscription</h1>
      </div>

      {/* Status */}
      <div className={`subscribe-status ${isExpired ? 'expired' : 'active'}`}>
        <span className="subscribe-status-icon">{isExpired ? '⚠' : '✓'}</span>
        <div>
          {isExpired ? (
            <>
              <strong>Your listing is offline</strong>
              <p>Customers can't find you on Dishcovery until you renew.</p>
            </>
          ) : (
            <>
              <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining</strong>
              <p>Active until {subEnd!.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </>
          )}
        </div>
      </div>

      {/* What's included */}
      <div className="subscribe-includes">
        <p className="subscribe-includes-title">What's included</p>
        <ul className="subscribe-plan-features">
          <li>Visible on browse to all consumers</li>
          <li>Full profile — menu, gallery, announcements</li>
          <li>Direct WhatsApp inquiries</li>
          <li>Profile views &amp; tap analytics</li>
          <li>FSSAI verified badge</li>
        </ul>
      </div>

      {/* Plan picker */}
      <div className="subscribe-plans-section">
        <p className="subscribe-includes-title">Choose a plan</p>
        <div className="subscribe-plans-grid">
          {PLANS.map(plan => (
            <button
              key={plan.id}
              className={`sub-plan-card ${selectedPlan.id === plan.id ? 'selected' : ''}`}
              onClick={() => setSelectedPlan(plan)}
            >
              {plan.badge && <span className="sub-plan-badge">{plan.badge}</span>}
              <span className="sub-plan-label">{plan.label}</span>
              <span className="sub-plan-price">₹{plan.price.toLocaleString('en-IN')}</span>
              <span className="sub-plan-per-month">₹{plan.perMonth.toLocaleString('en-IN')}/mo</span>
            </button>
          ))}
        </div>
      </div>

      {/* Payment */}
      <div className="subscribe-payment">
        <h3>How to pay</h3>
        <p className="subscribe-pay-line">
          Transfer <strong>₹{selectedPlan.price.toLocaleString('en-IN')}</strong> for <strong>{selectedPlan.label}</strong> via UPI to:
        </p>
        <div className="subscribe-upi">dishcovery.blr@gmail.com</div>
        <p className="subscribe-pay-line" style={{ marginTop: 14 }}>Use this reference so we can match your payment:</p>
        <div className="subscribe-ref">{refCode}</div>
        <p className="subscribe-hint">
          Once you've paid, email us at <strong>dishcovery.blr@gmail.com</strong> with your reference code. We'll activate your listing within 24 hours.
        </p>
        <a
          href={`mailto:dishcovery.blr@gmail.com?subject=Subscription payment - ${refCode}&body=Hi, I've transferred ₹${selectedPlan.price} for a ${selectedPlan.label} Dishcovery subscription. Reference: ${refCode}. Please activate my listing. Kitchen: ${seller.display_name}`}
          className="subscribe-email-btn"
        >
          Email us after payment
        </a>
      </div>

      <p className="subscribe-footer-note">
        You can still edit your profile, menu, and gallery while your listing is offline — everything will be ready when you renew.
      </p>
    </div>
  )
}
