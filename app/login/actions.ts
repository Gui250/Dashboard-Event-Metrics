"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { assinar, COOKIE, DURACAO_S } from "@/lib/sessao";

const SEM_CONFIG =
  "Login não configurado: defina SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_CHAVE_SERVIDOR e SESSAO_SEGREDO (32+ caracteres).";

function configurado() {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_CHAVE_SERVIDOR, SESSAO_SEGREDO } = process.env;
  return (
    !!SUPABASE_URL &&
    !!SUPABASE_PUBLISHABLE_KEY &&
    !!SUPABASE_CHAVE_SERVIDOR &&
    (SESSAO_SEGREDO?.length ?? 0) >= 32
  );
}

/**
 * Chama uma RPC do banco; `undefined` = o banco não respondeu ou recusou.
 * A chave publishable sozinha não basta: cada RPC exige `p_chave`, cujo hash fica em `privado`.
 */
async function rpc(nome: string, args: object): Promise<unknown> {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ p_chave: process.env.SUPABASE_CHAVE_SERVIDOR, ...args }),
    cache: "no-store",
  });
  return res.ok ? res.json() : undefined;
}

async function abrirSessao(usuario: string): Promise<never> {
  (await cookies()).set(COOKIE, assinar(usuario, process.env.SESSAO_SEGREDO!), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_S,
  });
  redirect("/");
}

// ponytail: login e cadastro sem limite de tentativas; ponha rate limit na borda (Vercel/Cloudflare) se virar alvo.

export async function entrar(_: string | null, form: FormData): Promise<string | null> {
  if (!configurado()) return SEM_CONFIG;

  const usuario = String(form.get("usuario") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  if (!usuario || !senha) return "Usuário ou senha incorretos.";

  // A senha é conferida no banco (bcrypt em `confere_login`).
  const ok = await rpc("confere_login", { p_usuario: usuario, p_senha: senha });
  if (ok === undefined) return "Não foi possível conferir o login agora. Tente de novo.";
  if (ok !== true) return "Usuário ou senha incorretos.";
  return abrirSessao(usuario);
}

/** Cadastro aberto: cria a conta e já entra. Nunca sobrescreve um usuário existente. */
export async function cadastrar(_: string | null, form: FormData): Promise<string | null> {
  if (!configurado()) return SEM_CONFIG;

  const usuario = String(form.get("usuario") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  if (!usuario || usuario.length > 40) return "Informe um usuário de até 40 caracteres.";
  if (senha.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";

  const criou = await rpc("cria_usuario", { p_usuario: usuario, p_senha: senha });
  if (criou === undefined) return "Não foi possível cadastrar agora. Tente de novo.";
  if (criou !== true) return "Esse usuário já existe. Escolha outro ou entre com ele.";
  return abrirSessao(usuario);
}

export async function sair() {
  (await cookies()).delete(COOKIE);
  redirect("/login");
}
