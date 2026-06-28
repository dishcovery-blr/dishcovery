-- Give existing approved sellers a 30-day grace period so they aren't
-- immediately cut off when the browse filter goes live.
update public.sellers
  set subscription_end = now() + interval '30 days'
  where status = 'approved'
    and subscription_end is null;
