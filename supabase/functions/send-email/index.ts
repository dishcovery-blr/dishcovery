// supabase/functions/send-email/index.ts
// Deploy: supabase functions deploy send-email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = 'noreply@dishcovery.in'    // update with your domain
const APP_URL = Deno.env.get('APP_URL') ?? 'https://dishcovery.in'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  return res.json()
}

serve(async (req) => {
  const { type, seller_id, email, display_name, notes } = await req.json()

  // Fetch seller if seller_id provided but email not
  let sellerEmail = email
  let sellerName = display_name
  if (seller_id && (!email || !display_name)) {
    const { data: seller } = await supabase
      .from('sellers')
      .select('email, display_name')
      .eq('id', seller_id)
      .single()
    sellerEmail = seller?.email
    sellerName = seller?.display_name
  }

  if (!sellerEmail) {
    return new Response(JSON.stringify({ error: 'No email address found' }), { status: 400 })
  }

  let subject = ''
  let html = ''

  switch (type) {
    case 'seller_welcome':
      subject = 'Welcome to Dishcovery — your application is under review'
      html = `
        <h2>Welcome to Dishcovery, ${sellerName}!</h2>
        <p>Your application has been submitted and is under review. We typically review within 24 hours.</p>
        <p>While you wait, you can log in and set up your menu and add photos — they'll go live once you're approved.</p>
        <a href="${APP_URL}/seller/dashboard" style="background:#f97316;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">
          Go to your Dishcovery dashboard
        </a>
        <p style="margin-top:24px;font-size:13px;color:#666;">
          <strong>FSSAI reminder:</strong> Don't forget to complete your food safety registration
          at <a href="https://foscos.fssai.gov.in">foscos.fssai.gov.in</a> — you have 90 days from today.
        </p>
      `
      break

    case 'seller_approved':
      subject = 'You\'re approved — your listing is now live!'
      html = `
        <h2>Great news, ${sellerName}!</h2>
        <p>Your listing is now live on Dishcovery. Customers can discover and contact you.</p>
        <a href="${APP_URL}/seller/dashboard" style="background:#f97316;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">
          View your listing
        </a>
        <p style="margin-top:16px;">Share your profile link with friends and family to get your first reviews!</p>
      `
      break

    case 'seller_rejected':
      subject = 'Update on your application'
      html = `
        <h2>Hi ${sellerName},</h2>
        <p>We weren't able to approve your application at this time.</p>
        ${notes ? `<p><strong>Reason:</strong> ${notes}</p>` : ''}
        <p>You're welcome to reapply after making the necessary changes.</p>
        <a href="${APP_URL}/signup" style="background:#f97316;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">
          Update and reapply
        </a>
      `
      break

    case 'subscription_expiring':
      subject = 'Your subscription expires in 7 days'
      html = `
        <h2>Hi ${sellerName},</h2>
        <p>Your subscription expires in 7 days. Renew to keep your listing active and visible to customers.</p>
        <a href="${APP_URL}/seller/subscribe" style="background:#f97316;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">
          Renew subscription
        </a>
      `
      break

    case 'fssai_reminder':
      subject = 'FSSAI registration reminder — 30 days remaining'
      html = `
        <h2>Hi ${sellerName},</h2>
        <p>A quick reminder: your FSSAI registration deadline is in 30 days.</p>
        <p>Registration takes 15 minutes and costs ₹100. You can register as an individual from your home address.</p>
        <a href="https://foscos.fssai.gov.in" style="background:#f97316;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">
          Register on FSSAI portal
        </a>
        <p style="margin-top:16px;font-size:13px;color:#666;">
          Once registered, upload your certificate in your dashboard under Settings → FSSAI.
        </p>
      `
      break

    default:
      return new Response(JSON.stringify({ error: 'Unknown email type' }), { status: 400 })
  }

  const result = await sendEmail(sellerEmail, subject, html)
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  })
})
