-- ============================================================
-- Dishcovery — Initial Schema
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";

-- ============================================================
-- ENUMS
-- ============================================================
create type seller_type as enum ('baker', 'home_cook');
create type seller_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type fssai_status as enum ('not_submitted', 'in_progress', 'verified', 'expired');
create type subscription_status as enum ('trial', 'active', 'expired', 'cancelled');
create type plan_tier as enum ('basic', 'standard', 'premium', 'home_cook');
create type photo_type as enum ('cover', 'gallery', 'video_thumbnail');
create type offer_status as enum ('active', 'expired', 'archived');

-- ============================================================
-- SELLERS
-- ============================================================
create table sellers (
  id                    uuid primary key default uuid_generate_v4(),
  auth_user_id          uuid references auth.users(id) on delete cascade not null unique,

  -- identity
  seller_type           seller_type not null,
  status                seller_status not null default 'pending',
  display_name          text not null,
  bio                   text,
  avatar_url            text,
  cover_photo_url       text,

  -- contact
  whatsapp_number       text not null,
  phone_number          text,
  instagram_url         text,
  email                 text,

  -- location
  location_text         text,                    -- "Indiranagar, Bangalore"
  lat                   double precision,
  lng                   double precision,
  delivery_radius_km    int default 5,

  -- discovery tags
  cuisine_tags          text[] default '{}',     -- ["South Indian", "Bakes", "Cakes"]
  dietary_tags          text[] default '{}',     -- ["Eggless", "Vegan", "Gluten-free"]
  accepts_custom_orders boolean default true,

  -- operating hours (free text for now, e.g. "Mon-Sat 8am-8pm")
  operating_hours       text,

  -- fssai compliance
  fssai_number          text,
  fssai_status          fssai_status not null default 'not_submitted',
  fssai_grace_deadline  timestamptz,             -- 90 days from onboarding

  -- subscription
  subscription_end      timestamptz,

  -- analytics (lightweight counters, incremented via RPC)
  profile_views         int default 0,
  whatsapp_taps         int default 0,

  -- meta
  is_featured           boolean default false,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ============================================================
-- FSSAI DOCUMENTS
-- ============================================================
create table fssai_documents (
  id                  uuid primary key default uuid_generate_v4(),
  seller_id           uuid references sellers(id) on delete cascade not null,
  storage_path        text not null,             -- supabase storage path
  submission_status   fssai_status default 'in_progress',
  submitted_at        timestamptz default now(),
  verified_at         timestamptz,
  admin_notes         text,
  created_at          timestamptz default now()
);

-- ============================================================
-- MENU CATEGORIES
-- ============================================================
create table menu_categories (
  id          uuid primary key default uuid_generate_v4(),
  seller_id   uuid references sellers(id) on delete cascade not null,
  name        text not null,
  sort_order  int default 0,
  created_at  timestamptz default now()
);

-- ============================================================
-- MENU ITEMS
-- ============================================================
create table menu_items (
  id              uuid primary key default uuid_generate_v4(),
  seller_id       uuid references sellers(id) on delete cascade not null,
  category_id     uuid references menu_categories(id) on delete set null,
  name            text not null,
  description     text,
  price           numeric(10, 2) not null,
  photo_url       text,
  is_available    boolean default true,
  is_veg          boolean default true,
  dietary_flags   text[] default '{}',     -- ["Eggless", "Gluten-free"]
  sort_order      int default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- OFFERS / ANNOUNCEMENTS
-- ============================================================
create table offers (
  id          uuid primary key default uuid_generate_v4(),
  seller_id   uuid references sellers(id) on delete cascade not null,
  title       text not null,
  body        text,
  photo_urls  text[] default '{}',
  expires_at  timestamptz not null,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- ============================================================
-- SELLER MEDIA (photos + videos)
-- ============================================================
create table seller_photos (
  id            uuid primary key default uuid_generate_v4(),
  seller_id     uuid references sellers(id) on delete cascade not null,
  storage_path  text not null,
  photo_type    photo_type default 'gallery',
  caption       text,
  sort_order    int default 0,
  created_at    timestamptz default now()
);

-- ============================================================
-- CONSUMERS
-- ============================================================
create table consumers (
  id            uuid primary key default uuid_generate_v4(),
  auth_user_id  uuid references auth.users(id) on delete cascade not null unique,
  display_name  text not null,
  avatar_url    text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- REVIEWS
-- ============================================================
create table reviews (
  id          uuid primary key default uuid_generate_v4(),
  seller_id   uuid references sellers(id) on delete cascade not null,
  consumer_id uuid references consumers(id) on delete cascade not null,
  rating      int not null check (rating between 1 and 5),
  body        text,
  created_at  timestamptz default now(),
  unique (seller_id, consumer_id)              -- one review per consumer per seller
);

-- ============================================================
-- SAVES / FAVOURITES
-- ============================================================
create table saves (
  seller_id   uuid references sellers(id) on delete cascade not null,
  consumer_id uuid references consumers(id) on delete cascade not null,
  saved_at    timestamptz default now(),
  primary key (seller_id, consumer_id)
);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
create table subscriptions (
  id                uuid primary key default uuid_generate_v4(),
  seller_id         uuid references sellers(id) on delete cascade not null,
  plan_tier         plan_tier not null,
  status            subscription_status not null default 'trial',
  starts_at         timestamptz not null default now(),
  ends_at           timestamptz not null,
  razorpay_sub_id   text,
  razorpay_order_id text,
  amount_paise      int,                        -- amount in paise (₹299 = 29900)
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ============================================================
-- ADMIN ACTIONS LOG
-- ============================================================
create table admin_logs (
  id          uuid primary key default uuid_generate_v4(),
  action      text not null,                    -- "approved_seller", "rejected_fssai" etc
  target_id   uuid,
  target_type text,
  notes       text,
  created_at  timestamptz default now()
);

-- ============================================================
-- ANALYTICS EVENTS (lightweight)
-- ============================================================
create table analytics_events (
  id          uuid primary key default uuid_generate_v4(),
  seller_id   uuid references sellers(id) on delete cascade not null,
  event_type  text not null,                    -- "profile_view", "whatsapp_tap", "menu_view"
  consumer_id uuid references consumers(id) on delete set null,
  created_at  timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index on sellers (status);
create index on sellers (seller_type);
create index on sellers (fssai_status);
create index on sellers using gin (cuisine_tags);
create index on sellers using gin (dietary_tags);
create index on sellers (subscription_end);
create index on sellers (is_featured);
create index on offers (seller_id, is_active, expires_at);
create index on menu_items (seller_id, is_available);
create index on reviews (seller_id);
create index on analytics_events (seller_id, event_type, created_at);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger sellers_updated_at before update on sellers
  for each row execute function handle_updated_at();
create trigger menu_items_updated_at before update on menu_items
  for each row execute function handle_updated_at();
create trigger consumers_updated_at before update on consumers
  for each row execute function handle_updated_at();
create trigger subscriptions_updated_at before update on subscriptions
  for each row execute function handle_updated_at();

-- ============================================================
-- AUTO-CREATE SELLER/CONSUMER ON SIGNUP (via trigger)
-- Reads role from auth.users.raw_user_meta_data->>'role'
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
declare
  user_role text;
begin
  user_role := new.raw_user_meta_data->>'role';

  if user_role = 'consumer' then
    insert into consumers (auth_user_id, display_name)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
    );
  end if;

  -- sellers are created manually after role selection on onboarding screen
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- OFFER EXPIRY FUNCTION (called by cron)
-- ============================================================
create or replace function expire_offers()
returns void as $$
begin
  update offers
  set is_active = false
  where is_active = true
    and expires_at < now();
end;
$$ language plpgsql;

-- Schedule expiry check every 15 minutes (requires pg_cron)
-- Run this AFTER enabling pg_cron extension in Supabase dashboard:
-- select cron.schedule('expire-offers', '*/15 * * * *', 'select expire_offers()');

-- ============================================================
-- FSSAI GRACE PERIOD: auto-set on seller insert
-- ============================================================
create or replace function set_fssai_grace_deadline()
returns trigger as $$
begin
  if new.fssai_grace_deadline is null then
    new.fssai_grace_deadline := now() + interval '90 days';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger sellers_fssai_grace
  before insert on sellers
  for each row execute function set_fssai_grace_deadline();

-- ============================================================
-- FREE TRIAL: auto-create subscription on seller insert
-- ============================================================
create or replace function create_trial_subscription()
returns trigger as $$
begin
  insert into subscriptions (seller_id, plan_tier, status, starts_at, ends_at)
  values (
    new.id,
    case when new.seller_type = 'home_cook' then 'home_cook'::plan_tier else 'standard'::plan_tier end,
    'trial',
    now(),
    now() + interval '30 days'
  );

  -- set subscription_end on sellers row
  update sellers set subscription_end = now() + interval '30 days' where id = new.id;
  return new;
end;
$$ language plpgsql;

create trigger sellers_trial_subscription
  after insert on sellers
  for each row execute function create_trial_subscription();

-- ============================================================
-- RPC: increment analytics counters
-- ============================================================
create or replace function increment_profile_view(seller_uuid uuid)
returns void as $$
begin
  update sellers set profile_views = profile_views + 1 where id = seller_uuid;
  insert into analytics_events (seller_id, event_type) values (seller_uuid, 'profile_view');
end;
$$ language plpgsql security definer;

create or replace function increment_whatsapp_tap(seller_uuid uuid)
returns void as $$
begin
  update sellers set whatsapp_taps = whatsapp_taps + 1 where id = seller_uuid;
  insert into analytics_events (seller_id, event_type) values (seller_uuid, 'whatsapp_tap');
end;
$$ language plpgsql security definer;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table sellers enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table offers enable row level security;
alter table seller_photos enable row level security;
alter table consumers enable row level security;
alter table reviews enable row level security;
alter table saves enable row level security;
alter table subscriptions enable row level security;
alter table fssai_documents enable row level security;
alter table analytics_events enable row level security;
alter table admin_logs enable row level security;

-- Helper: is current user an admin?
create or replace function is_admin()
returns boolean as $$
  select coalesce(
    (select raw_user_meta_data->>'role' = 'admin' from auth.users where id = auth.uid()),
    false
  );
$$ language sql security definer;

-- Helper: get seller id for current user
create or replace function my_seller_id()
returns uuid as $$
  select id from sellers where auth_user_id = auth.uid() limit 1;
$$ language sql security definer;

-- Helper: get consumer id for current user
create or replace function my_consumer_id()
returns uuid as $$
  select id from consumers where auth_user_id = auth.uid() limit 1;
$$ language sql security definer;

-- ---------- sellers ----------
create policy "sellers: public read approved"
  on sellers for select using (status = 'approved');

create policy "sellers: owner read own"
  on sellers for select using (auth_user_id = auth.uid());

create policy "sellers: owner update own"
  on sellers for update using (auth_user_id = auth.uid());

create policy "sellers: insert own"
  on sellers for insert with check (auth_user_id = auth.uid());

create policy "sellers: admin all"
  on sellers for all using (is_admin());

-- ---------- menu_categories ----------
create policy "menu_categories: public read"
  on menu_categories for select using (
    exists (select 1 from sellers where id = menu_categories.seller_id and status = 'approved')
  );
create policy "menu_categories: owner manage"
  on menu_categories for all using (seller_id = my_seller_id());
create policy "menu_categories: admin all"
  on menu_categories for all using (is_admin());

-- ---------- menu_items ----------
create policy "menu_items: public read"
  on menu_items for select using (
    exists (select 1 from sellers where id = menu_items.seller_id and status = 'approved')
  );
create policy "menu_items: owner manage"
  on menu_items for all using (seller_id = my_seller_id());
create policy "menu_items: admin all"
  on menu_items for all using (is_admin());

-- ---------- offers ----------
create policy "offers: public read active"
  on offers for select using (
    is_active = true and
    exists (select 1 from sellers where id = offers.seller_id and status = 'approved')
  );
create policy "offers: owner manage"
  on offers for all using (seller_id = my_seller_id());
create policy "offers: admin all"
  on offers for all using (is_admin());

-- ---------- seller_photos ----------
create policy "seller_photos: public read"
  on seller_photos for select using (
    exists (select 1 from sellers where id = seller_photos.seller_id and status = 'approved')
  );
create policy "seller_photos: owner manage"
  on seller_photos for all using (seller_id = my_seller_id());
create policy "seller_photos: admin all"
  on seller_photos for all using (is_admin());

-- ---------- consumers ----------
create policy "consumers: owner read own"
  on consumers for select using (auth_user_id = auth.uid());
create policy "consumers: owner update own"
  on consumers for update using (auth_user_id = auth.uid());
create policy "consumers: insert own"
  on consumers for insert with check (auth_user_id = auth.uid());
create policy "consumers: admin all"
  on consumers for all using (is_admin());

-- ---------- reviews ----------
create policy "reviews: public read"
  on reviews for select using (true);
create policy "reviews: consumer insert own"
  on reviews for insert with check (consumer_id = my_consumer_id());
create policy "reviews: consumer update own"
  on reviews for update using (consumer_id = my_consumer_id());
create policy "reviews: admin all"
  on reviews for all using (is_admin());

-- ---------- saves ----------
create policy "saves: owner manage"
  on saves for all using (consumer_id = my_consumer_id());

-- ---------- subscriptions ----------
create policy "subscriptions: owner read own"
  on subscriptions for select using (seller_id = my_seller_id());
create policy "subscriptions: admin all"
  on subscriptions for all using (is_admin());

-- ---------- fssai_documents ----------
create policy "fssai_documents: owner manage"
  on fssai_documents for all using (seller_id = my_seller_id());
create policy "fssai_documents: admin all"
  on fssai_documents for all using (is_admin());

-- ---------- analytics_events ----------
create policy "analytics_events: owner read own"
  on analytics_events for select using (seller_id = my_seller_id());
create policy "analytics_events: insert anon"
  on analytics_events for insert with check (true);
create policy "analytics_events: admin all"
  on analytics_events for all using (is_admin());

-- ---------- admin_logs ----------
create policy "admin_logs: admin only"
  on admin_logs for all using (is_admin());

-- ============================================================
-- STORAGE BUCKETS (run in Supabase dashboard or via API)
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('seller-media', 'seller-media', true);
-- insert into storage.buckets (id, name, public) values ('fssai-docs', 'fssai-docs', false);
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

-- Storage RLS for seller-media (public read, owner write):
-- create policy "seller-media: public read" on storage.objects for select using (bucket_id = 'seller-media');
-- create policy "seller-media: owner upload" on storage.objects for insert with check (
--   bucket_id = 'seller-media' and auth.uid()::text = (storage.foldername(name))[1]
-- );
-- create policy "seller-media: owner delete" on storage.objects for delete using (
--   bucket_id = 'seller-media' and auth.uid()::text = (storage.foldername(name))[1]
-- );
