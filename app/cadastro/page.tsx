"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Marca } from "@/components/Marca";
import { CAMPO } from "@/components/ui";
import { cadastrar } from "../login/actions";

export default function Cadastro() {
  const [erro, acao, enviando] = useActionState(cadastrar, null);

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

        <p className="eyebrow">Criar conta</p>

        <label className="mt-5 block">
          <span className="eyebrow">Usuário</span>
          <input name="usuario" autoComplete="username" required maxLength={40} autoFocus className={CAMPO} />
        </label>
        <label className="mt-5 block">
          <span className="eyebrow">Senha</span>
          <input
            name="senha"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
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
          {enviando ? "Criando…" : "Criar conta e entrar"}
        </button>

        <p className="mt-5 text-center text-[0.85rem] text-muted">
          Já tem conta?{" "}
          <Link href="/login" className="text-gold transition-colors hover:text-gold-soft">
            Entrar
          </Link>
        </p>
      </form>
    </main>
  );
}
