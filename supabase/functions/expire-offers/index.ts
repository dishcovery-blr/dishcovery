// supabase/functions/expire-offers/index.ts
// Deploy: supabase functions deploy expire-offers
//
// Schedule in Supabase dashboard → Database → Extensions → pg_cron:
// select cron.schedule(
//   'expire-offers',
//   '*/15 * * * *',
//   $$select net.http_post(
//     url := 'https://<project-ref>.supabase.co/functions/v1/expire-offers',
//     headers := '{"Authorization": "Bearer <anon-key>"}'::jsonb
//   )$$
// );

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async () => {
  const { data, error } = await supabase
    .from('offers')
    .update({ is_active: false })
    .eq('is_active', true)
    .lt('expires_at', new Date().toISOString())
    .select('id')

  if (error) {
    console.error('Offer expiry error:', error)
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  console.log(`Expired ${data?.length ?? 0} offers`)
  return new Response(
    JSON.stringify({ expired: data?.length ?? 0 }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
