-- KR2MELO 5.3.47: portal do sindico por link secreto.
-- Execute no SQL Editor do MESMO projeto usado pelo aplicativo.
-- Preserva kr2melo_sync_state e seus dados.
-- Requer o painel e o portal 5.3.47 para publicar e consultar.
begin;

create table if not exists public.kr2melo_sindico_views (
  block_id text primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  token text not null check (length(token) >= 32),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now()
);

-- Se uma instalacao anterior tiver outra estrutura, pare sem modificar dados.
do $$
begin
  if (select count(*) from information_schema.columns
      where table_schema='public' and table_name='kr2melo_sindico_views'
      and (column_name,data_type) in (
        ('block_id','text'),('owner_id','uuid'),('token','text'),
        ('payload','jsonb'),('updated_at','timestamp with time zone'))) <> 5 then
    raise exception 'Estrutura do portal diferente da v5.3.47. Nao apague a tabela: solicite uma migracao especifica.';
  end if;
end $$;

alter table public.kr2melo_sindico_views enable row level security;
revoke all privileges on table public.kr2melo_sindico_views from public, anon, authenticated;
grant select, insert, update, delete on table public.kr2melo_sindico_views to authenticated;

drop policy if exists kr2_sindico_select_owner on public.kr2melo_sindico_views;
drop policy if exists kr2_sindico_insert_owner on public.kr2melo_sindico_views;
drop policy if exists kr2_sindico_update_owner on public.kr2melo_sindico_views;
drop policy if exists kr2_sindico_delete_owner on public.kr2melo_sindico_views;

-- Restritiva: impede que outra politica permissiva amplie o acesso por engano.
drop policy if exists kr2_sindico_owner_guard on public.kr2melo_sindico_views;
create policy kr2_sindico_owner_guard on public.kr2melo_sindico_views
  as restrictive for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy kr2_sindico_select_owner on public.kr2melo_sindico_views
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy kr2_sindico_insert_owner on public.kr2melo_sindico_views
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy kr2_sindico_update_owner on public.kr2melo_sindico_views
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy kr2_sindico_delete_owner on public.kr2melo_sindico_views
  for delete to authenticated using ((select auth.uid()) = owner_id);

-- O visitante nao recebe SELECT da tabela. A funcao permite uma unica
-- consulta pelo par exato predio + token. O link funciona como credencial.
create or replace function public.kr2melo_get_sindico_view(p_block_id text, p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select v.payload
  from public.kr2melo_sindico_views as v
  where v.block_id = p_block_id
    and v.token = p_token
    and length(p_token) >= 32
  limit 1;
$$;

revoke all privileges on function public.kr2melo_get_sindico_view(text,text) from public, anon, authenticated;
grant execute on function public.kr2melo_get_sindico_view(text,text) to anon, authenticated;
comment on function public.kr2melo_get_sindico_view(text,text)
  is 'Consulta somente leitura: exige block_id e token secreto exatos. Nao permite listar registros.';

notify pgrst, 'reload schema';
commit;

-- Verificacao de estrutura. Nao lista moradores, tokens ou cobrancas.
select c.relname as tabela, c.relrowsecurity as rls_ativado
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public' and c.relname in ('kr2melo_sync_state','kr2melo_sindico_views')
  and c.relkind in ('r','p') order by c.relname;

select
  has_table_privilege('anon','public.kr2melo_sindico_views','SELECT') as anon_pode_listar,
  has_function_privilege('anon','public.kr2melo_get_sindico_view(text,text)','EXECUTE') as anon_pode_consultar_com_token;
-- Esperado: false / true. Isso confere privilegios, nao substitui o teste do link.
