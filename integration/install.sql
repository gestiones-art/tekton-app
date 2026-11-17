-- Additive installation. Run through Supabase apply_migration after review.
-- No cron job is activated and no existing access policy is changed here.
create table public.integration_control (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  mailbox text not null,
  watermark timestamptz not null default now(),
  page_token text,
  cycle_started_at timestamptz,
  lease_owner uuid,
  lease_until timestamptz,
  last_started_at timestamptz,
  last_success_at timestamptz,
  last_error text
);
create table public.integration_senders (
  email text primary key check (email = lower(email)),
  municipio text not null
);
create table public.integration_expedientes (
  id uuid primary key default gen_random_uuid(),
  tramite_id uuid not null references public.tramites(id),
  municipio text not null,
  numero integer not null check (numero > 0),
  anio integer not null check (anio between 2000 and 2099),
  tipo text not null,
  carpeta_id text not null check (carpeta_id like 'id:%'),
  validado boolean not null default false,
  evidencia text not null,
  unique (municipio, numero, anio)
);
create table public.integration_messages (
  id uuid primary key default gen_random_uuid(),
  mailbox text not null,
  gmail_id text not null,
  received_at timestamptz,
  subject text,
  sender text,
  mapping_id uuid references public.integration_expedientes(id),
  status text not null default 'queued' check (status in ('queued','retry','review','done','ignored','dead')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mailbox, gmail_id)
);
create index integration_messages_pending on public.integration_messages (next_attempt_at) where status in ('queued','retry');
create table public.integration_documents (
  message_id uuid not null references public.integration_messages(id),
  attachment_key text not null,
  filename text not null,
  content_hash text not null,
  dropbox_id text not null,
  revision text,
  path text not null,
  primary key (message_id, attachment_key)
);

alter table public.integration_control enable row level security;
alter table public.integration_senders enable row level security;
alter table public.integration_expedientes enable row level security;
alter table public.integration_messages enable row level security;
alter table public.integration_documents enable row level security;
revoke all on public.integration_control,public.integration_senders,public.integration_expedientes,public.integration_messages,public.integration_documents from public,anon,authenticated;
grant all on public.integration_control,public.integration_senders,public.integration_expedientes,public.integration_messages,public.integration_documents to service_role;

create function public.integration_acquire(p_owner uuid) returns boolean
language sql security invoker set search_path = '' as $$
  with acquired as (
    update public.integration_control set lease_owner=p_owner,
      lease_until=now()+interval '10 minutes',last_started_at=now()
    where id and enabled and (lease_until is null or lease_until < now()) returning id
  ) select exists(select 1 from acquired);
$$;

create function public.integration_finish(p_message uuid, p_link text, p_note text) returns void
language plpgsql security invoker set search_path = '' as $$
declare msg public.integration_messages; dest public.integration_expedientes;
begin
  select * into strict msg from public.integration_messages where id=p_message for update;
  if msg.status='done' then return; end if;
  if msg.status not in ('queued','retry') then raise exception 'message_not_ready'; end if;
  select * into strict dest from public.integration_expedientes where id=msg.mapping_id and validado;
  -- Preserve existing state/responsibility and append only a verified archive notice.
  insert into public.movimientos(id,tramite_id,estado,pelota,nota,link,registrado_por)
    select msg.id,t.id,t.estado_actual,t.pelota,p_note,p_link,'Tékton - integración municipal'
    from public.tramites t where t.id=dest.tramite_id
    on conflict (id) do nothing;
  update public.integration_messages set status='done',reason=null,updated_at=now() where id=p_message;
end;
$$;
revoke execute on function public.integration_acquire(uuid),public.integration_finish(uuid,text,text) from public,anon,authenticated;
grant execute on function public.integration_acquire(uuid),public.integration_finish(uuid,text,text) to service_role;
