-- =====================================================================
-- Equipe da Construfase: cria os logins do sistema de vistoria.
-- Rode no SQL Editor DEPOIS do schema.sql. Pode rodar de novo sem problema
-- (quem já existe só tem nome e papel atualizados; a senha não muda).
--
-- Login = só o usuário (ex.: ricardo). O sistema completa sozinho com
-- "@vistoria.construfase.com.br" (DOMINIO_LOGIN no config.js). Ninguém digita isso.
-- Esses endereços não recebem e-mail: servem só para entrar no sistema.
--
-- SENHA INICIAL: troque 'TROQUE-AQUI' abaixo por uma senha provisória (mínimo 6 caracteres).
-- No primeiro acesso, o sistema obriga cada pessoa a criar a própria senha.
-- =====================================================================
with cfg as (select 'TROQUE-AQUI'::text as senha, 'vistoria.construfase.com.br'::text as dominio),
equipe(usuario, nome, papel) as (values
  ('eduardo',  'Eduardo', 'admin'),
  ('renata',   'Renata',         'engenheiro'),
  ('maria',    'Maria Eduarda',  'engenheiro'),
  ('ricardo',  'Ricardo',        'vistoriador'),
  ('henrique', 'Henrique',       'vistoriador'),
  ('wesley',   'Wesley',         'vistoriador'),
  ('junior',   'Junior',         'vistoriador'),
  ('joao',     'João Victor',    'vistoriador'),
  ('gabriel',  'Gabriel',        'vistoriador'),
  ('mario',    'Mario André',    'vistoriador'),
  ('ana',      'Ana',            'vistoriador')
),
novos as (
  select gen_random_uuid() as id, e.usuario || '@' || c.dominio as email, e.nome, c.senha
  from equipe e cross join cfg c
  where not exists (select 1 from auth.users u where lower(u.email) = lower(e.usuario || '@' || c.dominio))
),
u as (
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, email_change, email_change_token_new, recovery_token)
  select '00000000-0000-0000-0000-000000000000', n.id, 'authenticated', 'authenticated', n.email,
         extensions.crypt(n.senha, extensions.gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb,
         jsonb_build_object('nome', n.nome, 'trocar_senha', true), now(), now(), '', '', '', ''
  from novos n
  returning id, email
)
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from u;

-- Nome e papel de cada um (o nome tem que conter o nome usado na agenda)
with equipe(usuario, nome, papel) as (values
  ('eduardo','Eduardo','admin'), ('renata','Renata','engenheiro'), ('maria','Maria Eduarda','engenheiro'),
  ('ricardo','Ricardo','vistoriador'), ('henrique','Henrique','vistoriador'), ('wesley','Wesley','vistoriador'),
  ('junior','Junior','vistoriador'), ('joao','João Victor','vistoriador'), ('gabriel','Gabriel','vistoriador'),
  ('mario','Mario André','vistoriador'), ('ana','Ana','vistoriador')
)
insert into public.perfis (id, nome, papel)
select u.id, e.nome, e.papel
from equipe e join auth.users u on lower(u.email) = e.usuario || '@vistoria.construfase.com.br'
on conflict (id) do update set nome = excluded.nome, papel = excluded.papel;

-- Conferir:
select split_part(u.email, '@', 1) as usuario, p.nome, p.papel
from public.perfis p join auth.users u on u.id = p.id order by p.papel, p.nome;

-- Esqueceu a senha? Rode (trocando usuário e senha provisória):
-- update auth.users set encrypted_password = extensions.crypt('NOVA-PROVISORIA', extensions.gen_salt('bf')),
--   raw_user_meta_data = raw_user_meta_data || '{"trocar_senha":true}'
-- where email = 'ricardo@vistoria.construfase.com.br';
