-- Só cria: usuário existente não é sobrescrito, então o cadastro aberto não toma a conta de ninguém.
create function public.cria_usuario(p_usuario text, p_senha text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  insert into public.usuarios (usuario, senha_hash)
  values (p_usuario, extensions.crypt(p_senha, extensions.gen_salt('bf', 10)))
  on conflict (usuario) do nothing
  returning true;
$$;

revoke execute on function public.cria_usuario(text, text) from public, anon, authenticated;
grant execute on function public.cria_usuario(text, text) to service_role;
