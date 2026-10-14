-- Keep hashed rate-limit bucket metadata bounded without requiring pg_cron.
-- The same function is installed in production through Supabase migration 20261014002750.

create or replace function public.consume_paperwise_ai_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start timestamptz;
  v_count integer;
begin
  if p_bucket is null or length(p_bucket) < 16 or length(p_bucket) > 128
     or p_limit < 1 or p_limit > 100
     or p_window_seconds < 1 or p_window_seconds > 3600 then
    return false;
  end if;

  if floor(extract(epoch from clock_timestamp()))::bigint % 600 = 0 then
    delete from public.paperwise_ai_rate_limits
      where window_start < clock_timestamp() - interval '48 hours';
  end if;

  v_start := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);
  insert into public.paperwise_ai_rate_limits(bucket, window_start, request_count)
    values (p_bucket, v_start, 1)
  on conflict (bucket, window_start)
  do update set request_count = public.paperwise_ai_rate_limits.request_count + 1
  returning request_count into v_count;
  return v_count <= p_limit;
end;
$$;
revoke all on function public.consume_paperwise_ai_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_paperwise_ai_rate_limit(text, integer, integer) to service_role;
