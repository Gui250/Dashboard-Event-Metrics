import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * Sessão sem estado: o cookie carrega `usuario.expira.assinatura`, com HMAC-SHA256
 * sobre SESSAO_SEGREDO. O banco (Supabase) só entra no login; o proxy não o consulta.
 */
export const COOKIE = "sessao";
export const DURACAO_S = 60 * 60 * 12;

const hmac = (dados: string, segredo: string) =>
  createHmac("sha256", segredo).update(dados).digest("base64url");

function iguais(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function assinar(usuario: string, segredo: string, agora = Date.now()): string {
  const dados = `${Buffer.from(usuario).toString("base64url")}.${agora + DURACAO_S * 1000}`;
  return `${dados}.${hmac(dados, segredo)}`;
}

/** O usuário da sessão, ou null se o token faltar, estiver adulterado ou vencido. */
export function verificar(
  token: string | undefined,
  segredo: string | undefined,
  agora = Date.now()
): string | null {
  if (!token || !segredo) return null;
  const [u, expira, assinatura] = token.split(".");
  if (!assinatura || !iguais(assinatura, hmac(`${u}.${expira}`, segredo))) return null;
  if (!(Number(expira) > agora)) return null;
  return Buffer.from(u, "base64url").toString();
}
