create table profiles (id uuid primary key references auth.users(id) on delete cascade, role text not null default 'customer' check (role in ('customer','admin')), created_at timestamptz not null default now());
create table products (id uuid primary key default gen_random_uuid(), title text not null, description text not null, price_paise integer not null check (price_paise > 0), cover_asset_key text, pdf_asset_key text not null, active boolean not null default true, updated_at timestamptz not null default now());
create table orders (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), amount_paise integer not null, currency text not null default 'INR', status text not null check (status in ('pending','paid','failed','refunded')), provider_order_id text unique not null, provider_payment_id text unique, paid_at timestamptz);
create table order_items (id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id) on delete cascade, product_id uuid not null references products(id), unit_price_paise integer not null);
create table webhook_events (provider_event_id text primary key, payload_hash text not null, received_at timestamptz not null default now());
create table download_tokens (id uuid primary key default gen_random_uuid(), order_item_id uuid not null references order_items(id) on delete cascade, expires_at timestamptz not null, used_at timestamptz);
alter table profiles enable row level security; alter table products enable row level security; alter table orders enable row level security; alter table order_items enable row level security;
create policy "customers see own orders" on orders for select using (auth.uid() = user_id);
create policy "customers see own order items" on order_items for select using (exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));
create policy "public sees active products" on products for select using (active = true);
-- Keep the private-pdfs Storage bucket private. Server service-role access is used only by the functions above.
