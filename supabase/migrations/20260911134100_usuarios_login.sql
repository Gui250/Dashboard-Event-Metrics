create extension if not exists pgcrypto with schema extensions;

create table public.usuarios (
  usuario    text primary key,
  senha_hash text not null,  -- bcrypt: extensions.crypt(senha, extensions.gen_salt('bf', 10))
  criado_em  timestamptz not null default now()
);

-- RLS sem política: a tabela é invisível para anon/authenticated; só a função abaixo a lê.
alter table public.usuarios enable row level security;
revoke all on public.usuarios from anon, authenticated;

create function public.confere_login(p_usuario text, p_senha text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  h text;
begin
  select senha_hash into h from public.usuarios where usuario = p_usuario;
  -- Usuário inexistente também paga um bcrypt, senão o tempo de resposta o denunciaria.
  return coalesce(extensions.crypt(p_senha, coalesce(h, extensions.gen_salt('bf', 10))) = h, false);
end;
$$;

revoke execute on function public.confere_login(text, text) from public, anon, authenticated;
grant execute on function public.confere_login(text, text) to service_role;
