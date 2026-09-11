"use client";

import { useActionState } from "react";
import { Marca } from "@/components/Marca";
import { entrar } from "./actions";

const CAMPO =
  "mt-2 w-full rounded-xl border border-line bg-ink-2/80 px-4 py-3 text-[0.95rem] text-cream outline-none transition-colors focus:border-gold";

export default function Login() {
  const [erro, acao, enviando] = useActionState(entrar, null);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <form
        action={acao}
        className="rise w-full max-w-sm rounded-[22px] border border-line/70 bg-surface/55 p-7 backdrop-blur-sm sm:p-8"
      >
        <div className="flex items-center gap-4">
          <Marca size={48} />
          <div>
            <p className="font-display text-[1.9rem] leading-none text-cream">Fazendinha</p>
            <p className="font-display mt-1 text-[0.78rem] tracking-[0.42em] text-gold uppercase">
              Resort Privé
            </p>
          </div>
        </div>

        <div className="hairline my-7" />

        <label className="block">
          <span className="eyebrow">Usuário</span>
          <input name="usuario" autoComplete="username" required autoFocus className={CAMPO} />
        </label>
        <label className="mt-5 block">
          <span className="eyebrow">Senha</span>
          <input
            name="senha"
            type="password"
            autoComplete="current-password"
            required
            className={CAMPO}
          />
        </label>

        {erro && (
          <p role="alert" className="mt-5 text-[0.85rem] text-[#e58aa0]">
            {erro}
          </p>
        )}

        <button
          disabled={enviando}
          className="mt-7 w-full rounded-full bg-gold px-5 py-3 text-[0.9rem] font-medium text-ink transition-colors hover:bg-gold-soft disabled:opacity-60"
        >
          {enviando ? "Entrando…" : "Entrar no painel"}
        </button>
      </form>
    </main>
  );
}
