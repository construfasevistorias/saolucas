-- =====================================================================
-- Tela "Usuários" do sistema: o ADMINISTRADOR cadastra pessoas e redefine
-- senhas pelo celular, sem SQL. Rode UMA VEZ no SQL Editor.
-- Pode rodar de novo sem problema.
-- =====================================================================

-- Só quem é admin pode usar as funções abaixo
create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and papel = 'admin');
$$;

-- Lista quem tem login (usuário, nome, papel, se ainda está com a senha provisória, último acesso)
create or replace function public.listar_usuarios()
returns table (id uuid, usuario text, nome text, papel text, senha_provisoria boolean, ultimo_acesso timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.eh_admin() then raise exception 'Só o administrador pode ver os usuários'; end if;
  return query
    select u.id, split_part(u.email, '@', 1)::text, p.nome, p.papel,
           coalesce(u.raw_user_meta_data->>'trocar_senha', 'false') = 'true', u.last_sign_in_at
    from auth.users u join public.perfis p on p.id = u.id
    where u.email like '%@vistoria.construfase.com.br'
    order by p.papel, p.nome;
end $$;

-- Cria um login novo (a pessoa troca a senha no primeiro acesso)
create or replace function public.criar_usuario(p_usuario text, p_nome text, p_papel text, p_senha text)
returns uuid language plpgsql security definer set search_path = public, auth, extensions as $$
declare v_id uuid := gen_random_uuid(); v_email text;
begin
  if not public.eh_admin() then raise exception 'Só o administrador pode cadastrar usuários'; end if;
  p_usuario := lower(trim(p_usuario));
  if p_usuario !~ '^[a-z0-9._-]{2,30}$' then raise exception 'Usuário inválido: use só letras minúsculas sem acento, números, ponto ou hífen'; end if;
  if coalesce(trim(p_nome), '') = '' then raise exception 'Informe o nome'; end if;
  if p_papel not in ('vistoriador', 'engenheiro', 'admin') then raise exception 'Papel inválido'; end if;
  if length(coalesce(p_senha, '')) < 6 then raise exception 'A senha provisória precisa ter pelo menos 6 caracteres'; end if;
  v_email := p_usuario || '@vistoria.construfase.com.br';
  if exists (select 1 from auth.users where lower(email) = v_email) then raise exception 'Já existe o usuário %', p_usuario; end if;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_senha, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('nome', trim(p_nome), 'trocar_senha', true), now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text, jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true), 'email', now(), now(), now());
  insert into public.perfis (id, nome, papel) values (v_id, trim(p_nome), p_papel)
  on conflict (id) do update set nome = excluded.nome, papel = excluded.papel;
  return v_id;
end $$;

-- Esqueceu a senha: define uma senha provisória nova (troca obrigatória no próximo acesso)
create or replace function public.redefinir_senha(p_usuario text, p_senha text)
returns void language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if not public.eh_admin() then raise exception 'Só o administrador pode redefinir senhas'; end if;
  if length(coalesce(p_senha, '')) < 6 then raise exception 'A senha provisória precisa ter pelo menos 6 caracteres'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_senha, extensions.gen_salt('bf')),
         raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"trocar_senha": true}'::jsonb, updated_at = now()
   where lower(email) = lower(trim(p_usuario)) || '@vistoria.construfase.com.br';
  if not found then raise exception 'Usuário % não encontrado', p_usuario; end if;
end $$;

-- Muda nome ou papel de alguém
create or replace function public.alterar_usuario(p_id uuid, p_nome text, p_papel text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'Só o administrador pode alterar usuários'; end if;
  if p_papel not in ('vistoriador', 'engenheiro', 'admin') then raise exception 'Papel inválido'; end if;
  if p_id = auth.uid() and p_papel <> 'admin' then raise exception 'Você não pode tirar o seu próprio acesso de administrador'; end if;
  update public.perfis set nome = trim(p_nome), papel = p_papel where id = p_id;
end $$;

revoke all on function public.eh_admin(), public.listar_usuarios(), public.criar_usuario(text, text, text, text),
  public.redefinir_senha(text, text), public.alterar_usuario(uuid, text, text) from public, anon;
grant execute on function public.eh_admin(), public.listar_usuarios(), public.criar_usuario(text, text, text, text),
  public.redefinir_senha(text, text), public.alterar_usuario(uuid, text, text) to authenticated;

-- Conferir: deve listar as 5 funções
select proname from pg_proc where proname in ('eh_admin', 'listar_usuarios', 'criar_usuario', 'redefinir_senha', 'alterar_usuario');
