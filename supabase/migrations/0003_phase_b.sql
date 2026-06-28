-- Phase B: item flavour field
alter table menu_items add column if not exists flavour text;
