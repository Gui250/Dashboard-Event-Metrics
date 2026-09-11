"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { assinar, COOKIE, DURACAO_S, verificar } from "@/lib/sessao";

const SEM_CONFIG =
  "Login não configurado: defina SUPABASE_URL, SUPABASE_SECRET_KEY e SESSAO_SEGREDO (32+ caracteres).";

function configurado() {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY, SESSAO_SEGREDO } = process.env;
  return !!SUPABASE_URL && !!SUPABASE_SECRET_KEY && (SESSAO_SEGREDO?.length ?? 0) >= 32;
}

/** Chama uma função do banco que só o service_role executa; `undefined` = o banco não respondeu. */
async function rpc(nome: string, args: object): Promise<unknown> {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { apikey: process.env.SUPABASE_SECRET_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  return res.ok ? res.json() : undefined;
}

export async function entrar(_: string | null, form: FormData): Promise<string | null> {
  if (!configurado()) return SEM_CONFIG;

  const usuario = String(form.get("usuario") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  if (!usuario || !senha) return "Usuário ou senha incorretos.";

  // A senha é conferida no banco (bcrypt em `confere_login`).
  // ponytail: sem limite de tentativas; ponha rate limit na borda (Vercel/Cloudflare) se o painel ficar público.
  const ok = await rpc("confere_login", { p_usuario: usuario, p_senha: senha });
  if (ok === undefined) return "Não foi possível conferir o login agora. Tente de novo.";
  if (ok !== true) return "Usuário ou senha incorretos.";

  (await cookies()).set(COOKIE, assinar(usuario, process.env.SESSAO_SEGREDO!), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_S,
  });
  redirect("/");
}

export async function sair() {
  (await cookies()).delete(COOKIE);
  redirect("/login");
}

/** Cria um usuário novo; nunca sobrescreve um existente (`cria_usuario` devolve null). */
export async function cadastrar(
  _: unknown,
  form: FormData
): Promise<{ ok: boolean; msg: string } | null> {
  // Action é alcançável por POST direto em qualquer rota, inclusive /login: o proxy não basta.
  if (!verificar((await cookies()).get(COOKIE)?.value, process.env.SESSAO_SEGREDO)) redirect("/login");
  if (!configurado()) return { ok: false, msg: SEM_CONFIG };

  const usuario = String(form.get("usuario") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  if (!usuario || usuario.length > 40) return { ok: false, msg: "Informe um usuário de até 40 caracteres." };
  if (senha.length < 8) return { ok: false, msg: "A senha precisa ter pelo menos 8 caracteres." };

  const criou = await rpc("cria_usuario", { p_usuario: usuario, p_senha: senha });
  if (criou === undefined) return { ok: false, msg: "Não foi possível cadastrar agora. Tente de novo." };
  if (criou !== true) return { ok: false, msg: `O usuário "${usuario}" já existe.` };
  return { ok: true, msg: `Usuário "${usuario}" criado. Passe a senha para a pessoa.` };
}
