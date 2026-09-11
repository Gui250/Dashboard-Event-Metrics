"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Marca } from "@/components/Marca";
import { CAMPO } from "@/components/ui";
import { cadastrar } from "../login/actions";

export default function Cadastro() {
  const [estado, acao, enviando] = useActionState(cadastrar, null);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <form
        action={acao}
        className="rise w-full max-w-sm rounded-[22px] border border-line/70 bg-surface/55 p-7 backdrop-blur-sm sm:p-8"
      >
        <div className="flex items-center gap-4">
          <Marca size={48} />
          <div>
            <p className="font-display text-[1.9rem] leading-none text-cream">Novo usuário</p>
            <p className="mt-1.5 text-[0.82rem] text-muted">Acesso ao painel de conversão</p>
          </div>
        </div>

        <div className="hairline my-7" />

        <label className="block">
          <span className="eyebrow">Usuário</span>
          <input name="usuario" autoComplete="off" required maxLength={40} autoFocus className={CAMPO} />
        </label>
        <label className="mt-5 block">
          <span className="eyebrow">Senha</span>
          {/* Visível de propósito: quem cadastra repassa a senha e precisa conferir o que digitou. */}
          <input name="senha" autoComplete="new-password" required minLength={8} className={CAMPO} />
        </label>

        {estado && (
          <p
            role={estado.ok ? "status" : "alert"}
            className={`mt-5 text-[0.85rem] ${estado.ok ? "text-gold-soft" : "text-[#e58aa0]"}`}
          >
            {estado.msg}
          </p>
        )}

        <button
          disabled={enviando}
          className="mt-7 w-full rounded-full bg-gold px-5 py-3 text-[0.9rem] font-medium text-ink transition-colors hover:bg-gold-soft disabled:opacity-60"
        >
          {enviando ? "Cadastrando…" : "Cadastrar usuário"}
        </button>

        <Link
          href="/"
          className="mt-5 block text-center text-[0.78rem] tracking-[0.14em] text-muted uppercase transition-colors hover:text-cream"
        >
          Voltar ao painel
        </Link>
      </form>
    </main>
  );
}
