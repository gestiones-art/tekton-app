-- OAuth state is ephemeral; credentials are encrypted before reaching Postgres.
create table public.integration_oauth_sessions (
  state_hash text primary key,
  cookie_hash text not null,
  verifier text not null,
  expires_at timestamptz not null
);
create table public.integration_credentials (
  provider text primary key check(provider='google'),
  mailbox text not null,
  encrypted_token jsonb not null,
  scope text not null,
  connected_at timestamptz not null default now()
);
alter table public.integration_oauth_sessions enable row level security;
alter table public.integration_credentials enable row level security;
revoke all on public.integration_oauth_sessions,public.integration_credentials from public,anon,authenticated;
grant all on public.integration_oauth_sessions,public.integration_credentials to service_role;

create function public.integration_consume_oauth(p_state_hash text,p_cookie_hash text)
returns setof public.integration_oauth_sessions language sql security invoker set search_path='' as $$
  delete from public.integration_oauth_sessions
  where state_hash=p_state_hash and cookie_hash=p_cookie_hash and expires_at > now()
  returning *;
$$;
revoke execute on function public.integration_consume_oauth(text,text) from public,anon,authenticated;
grant execute on function public.integration_consume_oauth(text,text) to service_role;
