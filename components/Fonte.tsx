"use client";

import { useId, useRef, useState } from "react";

const ACEITA = ".xlsx,.xls,.xlsm";

function Botao({
  children,
  onClick,
  variante = "ghost",
  as = "button",
  ...rest
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variante?: "ouro" | "ghost";
  as?: "button" | "span";
} & React.HTMLAttributes<HTMLElement>) {
  const cls =
    variante === "ouro"
      ? "bg-gold text-ink hover:bg-gold-soft"
      : "border border-gold-dim/70 text-gold-soft hover:border-gold hover:bg-gold/10";
  const Tag = as;
  return (
    <Tag
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-[0.85rem] font-medium transition-colors ${cls}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function Fonte({
  titulo,
  descricao,
  arquivo,
  erro,
  onArquivo,
  onTemplate,
}: {
  titulo: string;
  descricao: string;
  arquivo: string | null;
  erro: string | null;
  onArquivo: (f: File) => void;
  onTemplate: () => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [sobre, setSobre] = useState(false);

  const receber = (fl: FileList | null) => {
    const f = fl?.[0];
    if (f) onArquivo(f);
  };

  const campo = (
    <input
      ref={input}
      id={id}
      type="file"
      accept={ACEITA}
      className="sr-only"
      onChange={(e) => {
        receber(e.target.files);
        e.target.value = "";
      }}
    />
  );

  if (arquivo) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[26px] border border-line/70 bg-surface/55 px-5 py-3 backdrop-blur-sm">
        {campo}
        <span className="size-2 rounded-full bg-gold" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-[0.85rem] text-cream">
          {arquivo}
          {erro && <span className="ml-2 text-[#e58aa0]">· {erro}</span>}
        </p>
        <label htmlFor={id}>
          <Botao as="span">Trocar planilha</Botao>
        </label>
        <button
          onClick={onTemplate}
          className="text-[0.85rem] text-muted underline decoration-gold-dim underline-offset-4 transition-colors hover:text-gold-soft"
        >
          Baixar template
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setSobre(true);
      }}
      onDragLeave={() => setSobre(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSobre(false);
        receber(e.dataTransfer.files);
      }}
      className={`rounded-[28px] border border-dashed p-8 text-center transition-colors sm:p-12 ${
        sobre ? "border-gold bg-gold/8" : "border-gold-dim/50 bg-surface/35"
      }`}
    >
      {campo}
      <svg viewBox="0 0 64 64" className="mx-auto size-14" aria-hidden>
        <circle cx="32" cy="32" r="27" fill="none" stroke="#8a6a25" strokeWidth="1.5" />
        <path
          d="M32 46c-9 0-15-7-15-14 0-6 5-11 11-11 4 0 7 2 9 5 2-2 4-3 7-3"
          fill="none"
          stroke="#c69630"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M32 24v16m0 0-5-5m5 5 5-5" stroke="#e3c179" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
      <h3 className="font-display mt-5 text-[1.6rem] text-cream">{titulo}</h3>
      <p className="mx-auto mt-2 max-w-md text-[0.9rem] leading-relaxed text-muted">{descricao}</p>
      {erro && (
        <p className="mx-auto mt-4 max-w-md rounded-2xl border border-wine/50 bg-wine/15 px-4 py-3 text-[0.85rem] text-[#e58aa0]">
          {erro}
        </p>
      )}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <label htmlFor={id}>
          <Botao as="span" variante="ouro">
            Selecionar planilha
          </Botao>
        </label>
        <Botao onClick={onTemplate}>Baixar template</Botao>
      </div>
      <p className="mt-4 text-[0.78rem] text-muted/80">
        Arraste o arquivo .xlsx aqui — a leitura acontece no seu navegador.
      </p>
    </div>
  );
}
