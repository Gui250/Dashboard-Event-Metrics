import { type NextRequest, NextResponse } from "next/server";
import { COOKIE, verificar } from "@/lib/sessao";

// O painel é uma página estática sem dados no servidor: barrar a rota aqui é
// a proteção inteira — as planilhas só existem no navegador de quem entrou.
export function proxy(req: NextRequest) {
  const logado = verificar(req.cookies.get(COOKIE)?.value, process.env.SESSAO_SEGREDO) !== null;
  const naTelaDeLogin = req.nextUrl.pathname === "/login";

  if (!logado && !naTelaDeLogin) return NextResponse.redirect(new URL("/login", req.url));
  if (logado && naTelaDeLogin) return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico).*)"],
};
