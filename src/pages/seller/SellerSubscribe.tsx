import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const MONTHLY_PRICE = 999

export default function SellerSubscribe() {
  const { seller, loading } = useAuth()
  const navigate = useNavigate()

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

      {/* Plan */}
      <div className="subscribe-plan">
        <div className="subscribe-plan-header">
          <span className="subscribe-plan-name">Dishcovery Listing</span>
          <span className="subscribe-plan-price">₹{MONTHLY_PRICE.toLocaleString('en-IN')}<span className="subscribe-plan-period">/month</span></span>
        </div>
        <ul className="subscribe-plan-features">
          <li>Visible on browse to all consumers</li>
          <li>Full profile — menu, gallery, announcements</li>
          <li>Direct WhatsApp inquiries</li>
          <li>Profile views & tap analytics</li>
          <li>FSSAI verified badge</li>
        </ul>
      </div>

      {/* Payment */}
      <div className="subscribe-payment">
        <h3>How to pay</h3>
        <p className="subscribe-pay-line">Transfer <strong>₹{MONTHLY_PRICE.toLocaleString('en-IN')}</strong> via UPI to:</p>
        <div className="subscribe-upi">dishcovery.blr@gmail.com</div>
        <p className="subscribe-pay-line" style={{ marginTop: 14 }}>Use this reference so we can match your payment:</p>
        <div className="subscribe-ref">{refCode}</div>
        <p className="subscribe-hint">
          Once you've paid, email us at <strong>dishcovery.blr@gmail.com</strong> with your reference code. We'll activate your listing within 24 hours.
        </p>
        <a
          href={`mailto:dishcovery.blr@gmail.com?subject=Subscription payment - ${refCode}&body=Hi, I've transferred ₹${MONTHLY_PRICE} for my Dishcovery subscription. Reference: ${refCode}. Please activate my listing. Kitchen: ${seller.display_name}`}
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
