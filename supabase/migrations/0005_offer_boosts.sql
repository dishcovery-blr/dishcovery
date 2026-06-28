create table public.offer_boosts (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  seller_id uuid not null references public.sellers(id) on delete cascade,
  boost_type text not null check (boost_type in ('browse_banner', 'splash')),
  days_purchased integer not null,
  amount_paise integer not null,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  razorpay_order_id text,
  razorpay_payment_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

grant all on public.offer_boosts to anon, authenticated;
alter table public.offer_boosts enable row level security;

create policy "offer_boosts: seller manage own"
  on public.offer_boosts for all
  using (seller_id = my_seller_id())
  with check (seller_id = my_seller_id());

create policy "offer_boosts: public read active"
  on public.offer_boosts for select
  using (payment_status = 'paid');

create policy "offer_boosts: admin all"
  on public.offer_boosts for all
  using (is_admin());

create index on public.offer_boosts (boost_type, payment_status, ends_at);
create index on public.offer_boosts (seller_id);
