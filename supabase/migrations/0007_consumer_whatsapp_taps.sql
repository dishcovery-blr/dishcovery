create table public.consumer_whatsapp_taps (
  id            uuid primary key default gen_random_uuid(),
  consumer_id   uuid not null references public.consumers(id) on delete cascade,
  seller_id     uuid not null references public.sellers(id)   on delete cascade,
  tapped_at     timestamptz not null default now(),
  unique (consumer_id, seller_id)
);

grant all on public.consumer_whatsapp_taps to anon, authenticated;
alter table public.consumer_whatsapp_taps enable row level security;

create policy "consumer read own taps"   on public.consumer_whatsapp_taps for select using  (my_consumer_id() = consumer_id);
create policy "consumer upsert own taps" on public.consumer_whatsapp_taps for insert with check (my_consumer_id() = consumer_id);
create policy "consumer update own taps" on public.consumer_whatsapp_taps for update using  (my_consumer_id() = consumer_id);
create policy "admin all taps"           on public.consumer_whatsapp_taps for all    using  (is_admin());

create index on public.consumer_whatsapp_taps (consumer_id, tapped_at desc);
