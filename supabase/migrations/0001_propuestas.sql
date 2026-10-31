create table public.proposals (
  slug text primary key check (slug ~ '^[a-z0-9-]{8,}$'),
  name text not null,
  client text not null default '',
  contact_channel text not null default 'otro' check (contact_channel in ('whatsapp', 'email', 'otro')),
  contact_value text not null default '',
  pin_enc text not null,
  html text not null,
  views integer not null default 0,
  last_viewed_at timestamptz,
  pin_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rate_limits (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null
);

alter table public.proposals enable row level security;
alter table public.rate_limits enable row level security;

revoke all on public.proposals from anon, authenticated;
revoke all on public.rate_limits from anon, authenticated;

create function public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into rate_limits as r (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update
    set count = case when r.reset_at <= now() then 1 else r.count + 1 end,
        reset_at = case when r.reset_at <= now() then now() + make_interval(secs => p_window_seconds) else r.reset_at end
  returning count into current_count;
  return current_count <= p_max;
end;
$$;

revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

create function public.register_view(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update proposals set views = views + 1, last_viewed_at = now() where slug = p_slug;
$$;

revoke all on function public.register_view(text) from public, anon, authenticated;
grant execute on function public.register_view(text) to service_role;
