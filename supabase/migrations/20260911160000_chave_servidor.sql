-- O servidor do painel chama as RPCs com a chave publishable (role anon) + uma chave própria,
-- cujo sha256 fica aqui. O schema `privado` não é exposto pela API.
-- A chave em si vive só em SUPABASE_CHAVE_SERVIDOR; para trocá-la:
--   insert into privado.chave_servidor values (extensions.digest('<nova>', 'sha256'));  e apague a antiga.
create schema privado;
revoke all on schema privado from public, anon, authenticated;
create table privado.chave_servidor (hash bytea primary key);

create function privado.exige_chave(p_chave text)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not exists (select 1 from privado.chave_servidor where hash = extensions.digest(coalesce(p_chave, ''), 'sha256')) then
    raise exception 'chave de servidor inválida' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function privado.exige_chave(text) from public;

drop function public.confere_login(text, text);
drop function public.cria_usuario(text, text);

create function public.confere_login(p_chave text, p_usuario text, p_senha text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  h text;
begin
  perform privado.exige_chave(p_chave);
  select senha_hash into h from public.usuarios where usuario = p_usuario;
  -- Usuário inexistente também paga um bcrypt, senão o tempo de resposta o denunciaria.
  return coalesce(extensions.crypt(p_senha, coalesce(h, extensions.gen_salt('bf', 10))) = h, false);
end;
$$;

-- Só cria: usuário existente não é sobrescrito, então o cadastro aberto não toma a conta de ninguém.
create function public.cria_usuario(p_chave text, p_usuario text, p_senha text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.exige_chave(p_chave);
  insert into public.usuarios (usuario, senha_hash)
  values (p_usuario, extensions.crypt(p_senha, extensions.gen_salt('bf', 10)))
  on conflict (usuario) do nothing;
  return found;
end;
$$;

revoke execute on function public.confere_login(text, text, text) from public, authenticated;
revoke execute on function public.cria_usuario(text, text, text) from public, authenticated;
grant execute on function public.confere_login(text, text, text) to anon, service_role;
grant execute on function public.cria_usuario(text, text, text) to anon, service_role;
