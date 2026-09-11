"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { assinar, COOKIE, DURACAO_S } from "@/lib/sessao";

export async function entrar(_: string | null, form: FormData): Promise<string | null> {
  const segredo = process.env.SESSAO_SEGREDO;
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !segredo || segredo.length < 32) {
    return "Login não configurado: defina SUPABASE_URL, SUPABASE_SECRET_KEY e SESSAO_SEGREDO (32+ caracteres).";
  }

  const usuario = String(form.get("usuario") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  if (!usuario || !senha) return "Usuário ou senha incorretos.";

  // A senha é conferida no banco (bcrypt em `confere_login`), que só o service_role executa.
  // ponytail: sem limite de tentativas; ponha rate limit na borda (Vercel/Cloudflare) se o painel ficar público.
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/confere_login`, {
    method: "POST",
    headers: { apikey: SUPABASE_SECRET_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ p_usuario: usuario, p_senha: senha }),
    cache: "no-store",
  });
  if (!res.ok) return "Não foi possível conferir o login agora. Tente de novo.";
  if ((await res.json()) !== true) return "Usuário ou senha incorretos.";

  (await cookies()).set(COOKIE, assinar(usuario, segredo), {
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
