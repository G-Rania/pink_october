-- Apply once to a dedicated Supabase project. ribbon-v1 has exactly 2,054 dots.
-- IDs/fingerprint are locked by tests; never change geometry in place.
begin;
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  dot_id text not null check (
    dot_id ~ '^ribbon-v1-[0-9]{5}$'
    and substring(dot_id from 11)::integer between 0 and 2053
  ),
  message text not null check (char_length(btrim(message)) between 3 and 280),
  author_name text not null default 'Anonymous' check (char_length(btrim(author_name)) between 1 and 40),
  symbol text not null default '' check (symbol in ('','🩷','🌷','🎀','✨')),
  status text not null default 'published' check (status in ('pending','published','rejected')),
  request_id uuid not null unique,
  created_at timestamptz not null default now()
);
-- Rejected messages release their spot; pending messages reserve theirs.
create unique index messages_occupied_dot on public.messages(dot_id) where status in ('pending','published');
create index messages_published_dot on public.messages(dot_id) where status = 'published';
create table public.rate_limits (
  visitor_key text not null check (visitor_key ~ '^[a-f0-9]{64}$'),
  kind text not null check (kind in ('submission','report')),
  window_start timestamptz not null,
  counter integer not null check (counter >= 1),
  primary key (visitor_key,kind)
);
create table public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  visitor_key text not null check (visitor_key ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique (message_id,visitor_key)
);
create index message_reports_by_message on public.message_reports(message_id);
alter table public.messages enable row level security;
alter table public.rate_limits enable row level security;
alter table public.message_reports enable row level security;
-- No anonymous table access. Constrained Netlify endpoints mediate reads/writes.
revoke all on public.messages,public.rate_limits,public.message_reports from public,anon,authenticated;
grant select,insert,update,delete on public.messages,public.rate_limits,public.message_reports to service_role;

create function public.consume_rate_limit(p_key text,p_kind text,p_limit integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_count integer; v_window timestamptz := date_trunc('hour',now());
begin
  insert into public.rate_limits as limits(visitor_key,kind,window_start,counter)
    values(p_key,p_kind,v_window,1)
    on conflict(visitor_key,kind) do update set
      counter=case when limits.window_start=v_window then limits.counter+1 else 1 end,
      window_start=v_window
    returning counter into v_count;
  if v_count>p_limit then raise exception using errcode='PT429',message='Rate limit exceeded'; end if;
end;
$$;

create function public.create_support_message(
  p_message text,p_author_name text,p_symbol text,p_request_id uuid,p_visitor_key text,p_status text default 'published'
)
returns table(id uuid,dot_id text,message text,author_name text,symbol text,status text,created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_message public.messages%rowtype; v_dot text; v_start integer;
begin
  if p_status not in ('published','pending') or p_status is null
    or p_message is null or char_length(btrim(p_message)) not between 3 and 280
    or p_author_name is null or char_length(btrim(p_author_name)) not between 1 and 40
    or p_symbol is null or p_symbol not in ('','🩷','🌷','🎀','✨')
    or p_request_id is null or p_visitor_key is null or p_visitor_key !~ '^[a-f0-9]{64}$'
    or p_message ~* '(https?://|www\.)' then
    raise exception using errcode='PT400',message='Invalid submission';
  end if;
  -- Serialize identical retry IDs before testing the unique constraint.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  select m.* into v_message from public.messages m where m.request_id=p_request_id;
  if found then
    if v_message.message<>btrim(p_message) or v_message.author_name<>btrim(p_author_name) or v_message.symbol<>p_symbol then
      raise exception using errcode='PT409',message='Request already used';
    end if;
    return query select v_message.id,v_message.dot_id,v_message.message,v_message.author_name,v_message.symbol,v_message.status,v_message.created_at;
    return;
  end if;
  perform public.consume_rate_limit(p_visitor_key,'submission',5);
  -- Short transaction-scoped allocator lock prevents races across instances.
  -- Candidates are computed, not stored. Unique index is the final safety net.
  perform pg_advisory_xact_lock(7042026);
  v_start := floor(random()*2054)::integer;
  select 'ribbon-v1-'||lpad(((v_start+candidate.n)%2054)::text,5,'0')
    into v_dot from generate_series(0,2053) as candidate(n)
    where not exists(
      select 1 from public.messages m
      where m.dot_id='ribbon-v1-'||lpad(((v_start+candidate.n)%2054)::text,5,'0')
        and m.status in ('pending','published')
    ) order by candidate.n limit 1;
  if v_dot is null then raise exception using errcode='PT409',message='Ribbon full'; end if;
  insert into public.messages as m(dot_id,message,author_name,symbol,status,request_id)
    values(v_dot,btrim(p_message),btrim(p_author_name),p_symbol,p_status,p_request_id)
    returning m.* into v_message;
  return query select v_message.id,v_message.dot_id,v_message.message,v_message.author_name,v_message.symbol,v_message.status,v_message.created_at;
end;
$$;

create function public.report_support_message(p_message_id uuid,p_visitor_key text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_visitor_key is null or p_visitor_key !~ '^[a-f0-9]{64}$' then
    raise exception using errcode='PT400',message='Invalid report';
  end if;
  if not exists(select 1 from public.messages m where m.id=p_message_id and m.status='published') then
    raise exception using errcode='PT404',message='Message not found';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_visitor_key||p_message_id::text,1));
  if exists(select 1 from public.message_reports r where r.message_id=p_message_id and r.visitor_key=p_visitor_key) then return; end if;
  perform public.consume_rate_limit(p_visitor_key,'report',10);
  insert into public.message_reports(message_id,visitor_key) values(p_message_id,p_visitor_key)
    on conflict(message_id,visitor_key) do nothing;
end;
$$;

-- PostgreSQL grants PUBLIC execute by default: revoke it on every RPC.
revoke all on function public.consume_rate_limit(text,text,integer) from public,anon,authenticated;
revoke all on function public.create_support_message(text,text,text,uuid,text,text) from public,anon,authenticated;
revoke all on function public.report_support_message(uuid,text) from public,anon,authenticated;
grant execute on function public.create_support_message(text,text,text,uuid,text,text) to service_role;
grant execute on function public.report_support_message(uuid,text) to service_role;
commit;
