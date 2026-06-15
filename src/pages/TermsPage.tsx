import { useNavigate } from 'react-router-dom'

export default function TermsPage() {
  const navigate = useNavigate()

  return (
    <div className="terms-page">
      <div className="terms-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <img src="/logo.png" alt="Dishcovery" className="terms-logo" />
      </div>

      <div className="terms-content">
        <h1>Terms & Conditions</h1>
        <p className="terms-updated">Last updated: June 2026</p>

        <section>
          <h2>1. What is Dishcovery?</h2>
          <p>Dishcovery is a marketing directory platform that connects consumers with home bakers, home cooks, and cloud kitchens. Dishcovery is not a food delivery platform. We do not handle orders, payments between buyers and sellers, or food delivery. All transactions occur directly between the consumer and the seller.</p>
        </section>

        <section>
          <h2>2. Seller responsibilities</h2>
          <p>By listing on Dishcovery, sellers agree to:</p>
          <ul>
            <li>Obtain and maintain a valid FSSAI registration within 90 days of onboarding</li>
            <li>Ensure all food prepared and sold complies with applicable food safety laws</li>
            <li>Provide accurate information about their products, ingredients, and allergens</li>
            <li>Handle all orders, payments, and delivery directly with consumers</li>
            <li>Not misrepresent their products or services</li>
          </ul>
          <p>Dishcovery is not liable for any food safety incidents, disputes between sellers and consumers, or any harm arising from products sold through listings on this platform.</p>
        </section>

        <section>
          <h2>3. Consumer responsibilities</h2>
          <p>By using Dishcovery, consumers acknowledge that:</p>
          <ul>
            <li>Orders are placed directly with sellers via WhatsApp or phone</li>
            <li>Dishcovery is not a party to any transaction between consumers and sellers</li>
            <li>Dishcovery does not guarantee the quality, safety, or delivery of any food products</li>
            <li>Any disputes regarding orders must be resolved directly with the seller</li>
          </ul>
        </section>

        <section>
          <h2>4. Subscriptions</h2>
          <p>Sellers access the platform through paid subscriptions. Subscription fees are non-refundable unless otherwise stated. Dishcovery reserves the right to suspend or terminate listings for non-payment or violation of these terms.</p>
        </section>

        <section>
          <h2>5. FSSAI compliance</h2>
          <p>All sellers are required to obtain FSSAI registration. Sellers are given a 90-day grace period from onboarding to submit their registration. Dishcovery displays FSSAI status on each listing for consumer awareness but is not responsible for verifying the validity of registrations submitted by sellers.</p>
        </section>

        <section>
          <h2>6. Reviews</h2>
          <p>Consumer reviews must be honest and based on genuine experience. Dishcovery reserves the right to remove reviews that are fraudulent, abusive, or violate community standards.</p>
        </section>

        <section>
          <h2>7. Data and privacy</h2>
          <p>Dishcovery collects and stores user data as necessary to operate the platform. We do not sell personal data to third parties. By using Dishcovery, you consent to the collection and use of your data as described in our Privacy Policy.</p>
        </section>

        <section>
          <h2>8. Limitation of liability</h2>
          <p>Dishcovery provides the platform on an "as is" basis. To the maximum extent permitted by law, Dishcovery shall not be liable for any indirect, incidental, or consequential damages arising from the use of the platform.</p>
        </section>

        <section>
          <h2>9. Changes to terms</h2>
          <p>Dishcovery reserves the right to update these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.</p>
        </section>

        <section>
          <h2>10. Contact</h2>
          <p>For any questions regarding these terms, contact us at <a href="mailto:hello@dishcovering.com">hello@dishcovering.com</a>.</p>
        </section>
      </div>
    </div>
  )
}
