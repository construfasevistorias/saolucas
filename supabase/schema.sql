-- =====================================================================
-- Vistoria de Entrega · Construfase
-- Rode este arquivo inteiro no Supabase: SQL Editor > New query > Run
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- Perfis da equipe (ligados ao login do Supabase) ----------
create table if not exists public.perfis (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null default '',
  papel       text not null default 'vistoriador'
              check (papel in ('vistoriador','engenheiro','admin')),
  criado_em   timestamptz not null default now()
);

-- Cria o perfil automaticamente quando um usuário é criado
create or replace function public.criar_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- ---------- Empreendimentos ----------
create table if not exists public.empreendimentos (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null unique,
  cidade      text default 'Criciúma-SC',
  endereco    text default '',   -- usado no Termo de Vistoria (FS010-02)
  criado_em   timestamptz not null default now()
);

-- ---------- Unidades ----------
create table if not exists public.unidades (
  id                uuid primary key default gen_random_uuid(),
  empreendimento_id uuid not null references public.empreendimentos(id) on delete cascade,
  bloco             text not null default '',
  numero            text not null,
  proprietario      text not null default '',
  telefone          text default '',
  tipologia         text default '',            -- ex.: "Final 03 · 2 dorm. c/ suíte"
  planta            text default '',            -- arquivo em img/plantas (ex.: final-03)
  comodos           text[] not null default '{}', -- cômodos da tipologia (lista da vistoria)
  garagem           text default '',            -- box(es) de garagem
  data_contrato     text default '',            -- data do contrato de compromisso de compra e venda
  status            text not null default 'pendente'
                    check (status in ('pendente','em_vistoria','concluida')),
  atualizado_em     timestamptz not null default now(),
  unique (empreendimento_id, bloco, numero)
);

-- ---------- Vistorias (uma por visita à unidade) ----------
create table if not exists public.vistorias (
  id                uuid primary key default gen_random_uuid(),
  unidade_id        uuid not null references public.unidades(id) on delete cascade,
  empreendimento_id uuid not null references public.empreendimentos(id) on delete cascade,
  vistoriador_id    uuid references public.perfis(id),
  acompanhante      text default '',          -- quem acompanhou (cliente ou procurador)
  observacoes       text default '',
  chaves            text default '' check (chaves in ('','entregues','retidas')),
  prazo_reparo      date,                       -- até 30 dias quando a Construfase fica com as chaves (FS010-02)
  status            text not null default 'em_andamento'
                    check (status in ('em_andamento','concluida')),
  iniciada_em       timestamptz not null default now(),
  concluida_em      timestamptz
);

-- ---------- Ocorrências ----------
create table if not exists public.ocorrencias (
  id                uuid primary key default gen_random_uuid(),
  vistoria_id       uuid not null references public.vistorias(id) on delete cascade,
  unidade_id        uuid not null references public.unidades(id) on delete cascade,
  empreendimento_id uuid not null references public.empreendimentos(id) on delete cascade,
  comodo            text not null,
  area              text not null,
  descricao         text not null,
  gravidade         text not null default 'media' check (gravidade in ('baixa','media','alta')),
  fotos             text[] not null default '{}',   -- caminhos no bucket "fotos"
  sugestao          text default '',                -- solução sugerida (IA/base)
  resolve_na_hora   boolean default false,
  corriqueiro       boolean default true,         -- está na Lista de Serviços Corriqueiros (FS014-02)?
  equipe            text default '',                -- equipe indicada / acionada
  status            text not null default 'aberta'
                    check (status in ('aberta','resolvida_na_hora','equipe_acionada','resolvida')),
  criado_por        uuid references public.perfis(id),
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),
  atualizado_por    uuid references public.perfis(id)
);

create index if not exists ocorrencias_emp_idx on public.ocorrencias (empreendimento_id, criado_em desc);
create index if not exists ocorrencias_uni_idx on public.ocorrencias (unidade_id);

-- ---------- Agenda de vistorias (horários marcados com os clientes) ----------
create table if not exists public.agendamentos (
  id                uuid primary key default gen_random_uuid(),
  empreendimento_id uuid not null references public.empreendimentos(id) on delete cascade,
  unidade_id        uuid not null references public.unidades(id) on delete cascade,
  data              date not null,
  hora              time not null,
  cliente           text default '',   -- nome como está na agenda (pode ser procurador)
  responsavel       text default '',   -- quem da Construfase faz a vistoria
  equipe            text default '',
  observacao        text default '',
  criado_em         timestamptz not null default now()
);
create index if not exists agend_emp_data_idx on public.agendamentos (empreendimento_id, data, hora);

-- ---------- Base de soluções (editável pela equipe técnica) ----------
create table if not exists public.base_solucoes (
  id              uuid primary key default gen_random_uuid(),
  area            text not null,
  problema        text not null,
  solucao         text not null,
  resolve_na_hora boolean not null default false,
  equipe          text not null default '',
  ativo           boolean not null default true,
  atualizado_em   timestamptz not null default now()
);

-- ---------- Atualiza "atualizado_em" ----------
create or replace function public.tocar_atualizado()
returns trigger language plpgsql as $$
begin new.atualizado_em = now(); return new; end $$;

drop trigger if exists t_unidades_upd on public.unidades;
create trigger t_unidades_upd before update on public.unidades
  for each row execute function public.tocar_atualizado();
drop trigger if exists t_ocorr_upd on public.ocorrencias;
create trigger t_ocorr_upd before update on public.ocorrencias
  for each row execute function public.tocar_atualizado();
drop trigger if exists t_base_upd on public.base_solucoes;
create trigger t_base_upd before update on public.base_solucoes
  for each row execute function public.tocar_atualizado();

-- =====================================================================
-- Segurança (RLS): só quem está logado (equipe Construfase) acessa.
-- Cadastro público fica DESLIGADO no painel do Supabase
-- (Authentication > Providers > Email > desmarque "Allow new users to sign up").
-- =====================================================================
-- Acesso pela API só para quem fez login (funciona mesmo com "Automatically expose new tables" desligado)
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;

alter table public.perfis           enable row level security;
alter table public.empreendimentos  enable row level security;
alter table public.unidades         enable row level security;
alter table public.vistorias        enable row level security;
alter table public.ocorrencias      enable row level security;
alter table public.base_solucoes    enable row level security;
alter table public.agendamentos     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['empreendimentos','unidades','vistorias','ocorrencias','base_solucoes','agendamentos'] loop
    execute format('drop policy if exists "equipe_tudo" on public.%I', t);
    execute format('create policy "equipe_tudo" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

drop policy if exists "perfis_ler" on public.perfis;
create policy "perfis_ler" on public.perfis for select to authenticated using (true);
drop policy if exists "perfis_editar_proprio" on public.perfis;
create policy "perfis_editar_proprio" on public.perfis for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------- Fotos (Storage) ----------
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false)
on conflict (id) do nothing;

drop policy if exists "fotos_ler" on storage.objects;
create policy "fotos_ler" on storage.objects for select to authenticated
  using (bucket_id = 'fotos');
drop policy if exists "fotos_enviar" on storage.objects;
create policy "fotos_enviar" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos');
drop policy if exists "fotos_apagar" on storage.objects;
create policy "fotos_apagar" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos');

-- ---------- Tempo real (painel do engenheiro) ----------
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.ocorrencias'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.unidades';    exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.vistorias';   exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.agendamentos'; exception when others then null; end;
end $$;

-- ---------- Empreendimento inicial ----------
insert into public.empreendimentos (nome) values ('Residencial São Lucas')
on conflict (nome) do nothing;

-- ---------- Atualizações (seguro rodar de novo) ----------
alter table public.empreendimentos add column if not exists endereco text default '';
alter table public.unidades add column if not exists garagem text default '';
alter table public.unidades add column if not exists data_contrato text default '';
alter table public.vistorias add column if not exists chaves text default '';
alter table public.vistorias add column if not exists prazo_reparo date;
alter table public.ocorrencias add column if not exists corriqueiro boolean default true;
