create table profiles (id uuid primary key references auth.users(id) on delete cascade, role text not null default 'customer' check (role in ('customer','admin')), created_at timestamptz not null default now());
create table products (id uuid primary key default gen_random_uuid(), title text not null, description text not null, price_paise integer not null check (price_paise > 0), cover_asset_key text, pdf_asset_key text not null, active boolean not null default true, updated_at timestamptz not null default now());
create table orders (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 amount_paise integer not null check (amount_paise > 0),
 currency text not null default 'INR',
 status text not null check (status in ('pending','paid','failed','refunded')),
 provider_order_id text unique not null,
 provider_payment_id text unique,
 paid_at timestamptz,
 manual_payment_reference text,
 manual_submitted_at timestamptz,
 reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id)
);
create table order_items (id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id) on delete cascade, product_id uuid not null references products(id), unit_price_paise integer not null check (unit_price_paise > 0));
create table webhook_events (provider_event_id text primary key, payload_hash text not null, received_at timestamptz not null default now());
create table download_tokens (id uuid primary key default gen_random_uuid(), order_item_id uuid not null references order_items(id) on delete cascade, expires_at timestamptz not null, used_at timestamptz);
create table manual_payment_settings (id integer primary key default 1 check (id = 1), enabled boolean not null default false, updated_at timestamptz not null default now(), updated_by uuid references auth.users(id));
insert into manual_payment_settings (id, enabled) values (1, false);

alter table profiles enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table webhook_events enable row level security;
alter table download_tokens enable row level security;
alter table manual_payment_settings enable row level security;

create policy "users read own profile" on profiles for select to authenticated using ((select auth.uid()) = id);
create policy "customers see own orders" on orders for select to authenticated using ((select auth.uid()) = user_id);
create policy "customers see own order items" on order_items for select to authenticated using (exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = (select auth.uid())));
create policy "public sees active products" on products for select to anon, authenticated using (active = true);

create unique index orders_manual_payment_reference_normalized_uidx on orders (upper(btrim(manual_payment_reference))) where manual_payment_reference is not null and btrim(manual_payment_reference) <> '';
create index orders_user_id_idx on orders (user_id);
create index orders_reviewed_by_idx on orders (reviewed_by) where reviewed_by is not null;
create index order_items_order_id_idx on order_items (order_id);
create index order_items_product_id_idx on order_items (product_id);
create index download_tokens_order_item_id_idx on download_tokens (order_item_id);

-- Keep the private-pdfs Storage bucket private. Server service-role access is used only by authorized API handlers.
