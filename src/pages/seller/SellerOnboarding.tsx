import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

type Step = 'type' | 'details' | 'fssai' | 'done'

const CUISINE_OPTIONS = [
  'Cakes & Pastries', 'Bread & Loaves', 'Cookies & Biscuits', 'Chocolates',
  'South Indian', 'North Indian', 'Continental', 'Chinese', 'Snacks',
  'Healthy & Diet', 'Biryani', 'Desserts', 'Beverages', 'Other',
]

const DIETARY_OPTIONS = [
  'Eggless', 'Vegan', 'Gluten-Free', 'Nut-Free', 'Dairy-Free',
  'Jain', 'Keto', 'Low Sugar',
]

export default function SellerOnboarding() {
  const { user, refreshSeller } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('type')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [sellerType, setSellerType] = useState<'baker' | 'home_cook'>('baker')
  const [form, setForm] = useState({
    display_name: '',
    whatsapp_number: '',
    location_text: '',
    bio: '',
    operating_hours: '',
    cuisine_tags: [] as string[],
    dietary_tags: [] as string[],
    accepts_custom_orders: true,
  })
  const [fssaiOption, setFssaiOption] = useState<'have_it' | 'in_progress' | 'need_help'>('need_help')
  const [fssaiNumber, setFssaiNumber] = useState('')

  function toggleTag(arr: string[], val: string): string[] {
    return arr.includes(val) ? arr.filter(t => t !== val) : [...arr, val]
  }

  async function handleSubmit() {
    if (!user) return
    setLoading(true)
    setError('')

    try {
      const fssaiStatus =
        fssaiOption === 'have_it' ? 'verified' :
        fssaiOption === 'in_progress' ? 'in_progress' : 'not_submitted'

      const { data: seller, error: sellerErr } = await supabase
        .from('sellers')
        .insert({
          auth_user_id: user.id,
          seller_type: sellerType,
          status: 'pending',
          ...form,
          fssai_number: fssaiNumber || null,
          fssai_status: fssaiStatus,
        })
        .select()
        .single()

      if (sellerErr) throw sellerErr

      // Send welcome email via Supabase edge function
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'seller_welcome',
          seller_id: seller.id,
          email: user.email,
          display_name: form.display_name,
        },
      })

      await refreshSeller()
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="onboarding-container">
        <div className="done-card">
          <div className="done-icon">🎉</div>
          <h1>You're registered!</h1>
          <p>
            Your profile is under review. We'll email you within 24 hours once approved.
            While you wait, you can set up your menu and add photos.
          </p>
          <button onClick={() => navigate('/seller/dashboard')} className="btn-primary">
            Go to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <StepIndicator current={step} />

        {step === 'type' && (
          <div className="step">
            <h2>What best describes you?</h2>
            <p className="step-subtitle">This helps us show you to the right customers.</p>

            <div className="type-cards">
              <button
                className={`type-card ${sellerType === 'baker' ? 'selected' : ''}`}
                onClick={() => setSellerType('baker')}
              >
                <span className="type-icon">🧁</span>
                <strong>Baker / Cloud Kitchen</strong>
                <span>I run a baking business or small food brand</span>
              </button>
              <button
                className={`type-card ${sellerType === 'home_cook' ? 'selected' : ''}`}
                onClick={() => setSellerType('home_cook')}
              >
                <span className="type-icon">🍛</span>
                <strong>Home Cook</strong>
                <span>I take orders occasionally from my home kitchen</span>
              </button>
            </div>

            <button className="btn-primary" onClick={() => setStep('details')}>
              Continue
            </button>
          </div>
        )}

        {step === 'details' && (
          <div className="step">
            <h2>Tell us about yourself</h2>

            <div className="form-group">
              <label>Your name or brand name *</label>
              <input
                type="text"
                placeholder={sellerType === 'baker' ? "e.g. Priya's Bake Studio" : "e.g. Meena's Home Kitchen"}
                value={form.display_name}
                onChange={e => setForm({ ...form, display_name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>WhatsApp number *</label>
              <input
                type="tel"
                placeholder="91XXXXXXXXXX"
                value={form.whatsapp_number}
                onChange={e => setForm({ ...form, whatsapp_number: e.target.value })}
              />
              <span className="hint">Customers will contact you here to place orders</span>
            </div>

            <div className="form-group">
              <label>Your area in Bangalore *</label>
              <input
                type="text"
                placeholder="e.g. Indiranagar, HSR Layout"
                value={form.location_text}
                onChange={e => setForm({ ...form, location_text: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Short bio</label>
              <textarea
                placeholder="Tell customers what makes your food special…"
                value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>What do you make?</label>
              <div className="tag-grid">
                {CUISINE_OPTIONS.map(tag => (
                  <button
                    key={tag}
                    className={`tag ${form.cuisine_tags.includes(tag) ? 'selected' : ''}`}
                    onClick={() => setForm({ ...form, cuisine_tags: toggleTag(form.cuisine_tags, tag) })}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Dietary options you offer</label>
              <div className="tag-grid">
                {DIETARY_OPTIONS.map(tag => (
                  <button
                    key={tag}
                    className={`tag ${form.dietary_tags.includes(tag) ? 'selected' : ''}`}
                    onClick={() => setForm({ ...form, dietary_tags: toggleTag(form.dietary_tags, tag) })}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Operating hours</label>
              <input
                type="text"
                placeholder="e.g. Mon–Sat, 9am–8pm"
                value={form.operating_hours}
                onChange={e => setForm({ ...form, operating_hours: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.accepts_custom_orders}
                  onChange={e => setForm({ ...form, accepts_custom_orders: e.target.checked })}
                />
                I accept custom orders
              </label>
            </div>

            <div className="step-actions">
              <button className="btn-secondary" onClick={() => setStep('type')}>Back</button>
              <button
                className="btn-primary"
                disabled={!form.display_name || !form.whatsapp_number || !form.location_text}
                onClick={() => setStep('fssai')}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 'fssai' && (
          <div className="step">
            <h2>FSSAI food safety registration</h2>
            <p className="step-subtitle">
              FSSAI registration is required for anyone selling food in India.
              The basic registration costs just ₹100 and takes about 7 days.
            </p>

            <div className="fssai-options">
              <button
                className={`fssai-option ${fssaiOption === 'have_it' ? 'selected' : ''}`}
                onClick={() => setFssaiOption('have_it')}
              >
                <strong>I already have FSSAI registration</strong>
                <span>Enter your registration number below</span>
              </button>
              <button
                className={`fssai-option ${fssaiOption === 'in_progress' ? 'selected' : ''}`}
                onClick={() => setFssaiOption('in_progress')}
              >
                <strong>I've applied and it's in progress</strong>
                <span>We'll remind you to upload it once received</span>
              </button>
              <button
                className={`fssai-option ${fssaiOption === 'need_help' ? 'selected' : ''}`}
                onClick={() => setFssaiOption('need_help')}
              >
                <strong>I need to register — show me how</strong>
                <span>Takes 15 minutes, costs ₹100, valid from home kitchen</span>
              </button>
            </div>

            {fssaiOption === 'have_it' && (
              <div className="form-group">
                <label>FSSAI registration number</label>
                <input
                  type="text"
                  placeholder="14-digit registration number"
                  value={fssaiNumber}
                  onChange={e => setFssaiNumber(e.target.value)}
                  maxLength={14}
                />
              </div>
            )}

            {fssaiOption === 'need_help' && (
              <div className="fssai-guide-preview">
                <h4>How to register as an individual home baker</h4>
                <ol>
                  <li>Go to <strong>foscos.fssai.gov.in</strong></li>
                  <li>Click <strong>Apply for License / Registration</strong></li>
                  <li>Select <strong>Registration</strong> (turnover &lt; ₹12 lakh/year)</li>
                  <li>Fill your name, home address as business address</li>
                  <li>Business type: <strong>Petty Food Business Operator</strong></li>
                  <li>Pay ₹100 online</li>
                  <li>Certificate arrives in 7 working days</li>
                </ol>
                <p className="guide-note">
                  You don't need a company or brand name — you can register as an individual.
                  Your home address is a valid business address.
                </p>
                <a
                  href="https://foscos.fssai.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline"
                >
                  Open FSSAI portal ↗
                </a>
                <p className="grace-note">
                  Your profile will be listed as <strong>"Registration in progress"</strong> while
                  you complete this. You have 90 days from today to submit your registration number.
                </p>
              </div>
            )}

            {error && <p className="error-msg">{error}</p>}

            <div className="step-actions">
              <button className="btn-secondary" onClick={() => setStep('details')}>Back</button>
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={loading || (fssaiOption === 'have_it' && !fssaiNumber)}
              >
                {loading ? 'Submitting…' : 'Submit for review'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StepIndicator({ current }: { current: Step }) {
  const steps: Step[] = ['type', 'details', 'fssai']
  const labels = ['Type', 'Details', 'FSSAI']
  const currentIdx = steps.indexOf(current)

  return (
    <div className="step-indicator">
      {steps.map((s, i) => (
        <div key={s} className={`step-dot ${i <= currentIdx ? 'active' : ''}`}>
          <div className="dot" />
          <span>{labels[i]}</span>
          {i < steps.length - 1 && <div className="step-line" />}
        </div>
      ))}
    </div>
  )
}
