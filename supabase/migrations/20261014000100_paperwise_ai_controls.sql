-- PaperWise AI safety controls. Incremental and non-destructive: existing store data is untouched.
-- The rate limiter is shared across serverless instances and stores only HMAC digests, not IPs/user IDs.
create table if not exists public.ai_rate_limits (
  key_hash text not null check (key_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count > 0),
  primary key (key_hash, window_start)
);

create index if not exists ai_rate_limits_window_start_idx on public.ai_rate_limits(window_start);

alter table public.ai_rate_limits enable row level security;
revoke all on table public.ai_rate_limits from public, anon, authenticated;

create or replace function public.consume_ai_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_window_start timestamptz;
  v_request_count integer;
begin
  if p_key_hash is null or p_key_hash !~ '^[a-f0-9]{64}$'
     or p_limit is null or p_limit < 1 or p_limit > 200
     or p_window_seconds is null or p_window_seconds < 60 or p_window_seconds > 3600 then
    raise exception 'Invalid AI rate limit parameters';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into public.ai_rate_limits (key_hash, window_start, request_count)
  values (p_key_hash, v_window_start, 1)
  on conflict (key_hash, window_start)
  do update set request_count = public.ai_rate_limits.request_count + 1
  returning request_count into v_request_count;

  -- Bound retention for all hashed visitor keys; delete at most 200 old rows per request.
  delete from public.ai_rate_limits
  where ctid in (
    select ctid
    from public.ai_rate_limits
    where window_start < clock_timestamp() - interval '2 days'
    order by window_start asc
    limit 200
  );

  return v_request_count <= p_limit;
end;
$$;

revoke all on function public.consume_ai_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_rate_limit(text, integer, integer) to service_role;

-- Trusted database-side aggregation avoids client-side row-limit truncation of sales totals.
create or replace function public.ai_sales_summary(p_since timestamptz default null)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'paid_orders', count(*) filter (
      where status = 'paid' and (p_since is null or paid_at >= p_since)
    ),
    'net_sales_paise', coalesce(sum(amount_paise) filter (
      where status = 'paid' and (p_since is null or paid_at >= p_since)
    ), 0),
    'earliest_paid_at', min(paid_at) filter (where status = 'paid' and (p_since is null or paid_at >= p_since)),
    'latest_paid_at', max(paid_at) filter (where status = 'paid' and (p_since is null or paid_at >= p_since)),
    'pending_manual_orders', count(*) filter (
      where status = 'pending' and manual_payment_reference is not null
    ),
    'failed_orders', count(*) filter (where status = 'failed')
  )
  from public.orders;
$$;

revoke all on function public.ai_sales_summary(timestamptz) from public, anon, authenticated;
grant execute on function public.ai_sales_summary(timestamptz) to service_role;
