-- Phase A: team profile fields + seller review replies

alter table sellers add column if not exists team_bio text;
alter table sellers add column if not exists group_photo_url text;

alter table reviews add column if not exists seller_reply text;

-- Allow sellers to update reviews for their own store (to add replies)
create policy "reviews: seller reply"
  on reviews for update using (seller_id = my_seller_id());
