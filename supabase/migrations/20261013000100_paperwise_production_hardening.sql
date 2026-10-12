-- PaperWise production hardening.
-- Safe to run on the existing schema: preserves customer, product, and order data.

-- A profile policy must not query the same RLS-protected table recursively.
drop policy if exists "admins read profiles" on public.profiles;
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

-- Prevent the same normalized UPI reference being attached to multiple orders.
-- Existing duplicate references were checked before adding this index.
create unique index if not exists orders_manual_payment_reference_normalized_uidx
  on public.orders (upper(btrim(manual_payment_reference)))
  where manual_payment_reference is not null and btrim(manual_payment_reference) <> '';

-- Cover common foreign-key and customer order lookups.
create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_reviewed_by_idx on public.orders (reviewed_by) where reviewed_by is not null;
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_product_id_idx on public.order_items (product_id);
create index if not exists download_tokens_order_item_id_idx on public.download_tokens (order_item_id);

-- Keep webhook_events, download_tokens, and manual_payment_settings RLS enabled
-- with no client policies: they are intentionally accessible only through the
-- server-side service-role API after authorization checks.
