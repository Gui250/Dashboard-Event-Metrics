"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Fonte } from "@/components/Fonte";
import { Marca } from "@/components/Marca";
import { SecaoClientes } from "@/components/SecaoClientes";
import { SecaoEvento } from "@/components/SecaoEvento";
import { SecaoVendas } from "@/components/SecaoVendas";
import { type ClientesData, parseClientes, templateClientes } from "@/lib/clientes";
import { type EventoData, parseEvento, templateEvento } from "@/lib/evento";
import { parseVendas, templateVendas, type VendasData } from "@/lib/vendas";
import { sair } from "./login/actions";

type Aba = "vendas" | "clientes" | "evento";

const ABAS: { id: Aba; nome: string; nota: string }[] = [
  { id: "vendas", nome: "Vendas clientes", nota: "crescimento semanal 2024 – 2026" },
  { id: "clientes", nome: "Conversão de clientes", nota: "fluxo diário por clube" },
  { id: "evento", nome: "Evento", nota: "meta, ritmo e payback" },
];

const ERRO_GENERICO =
  "Não consegui ler esta planilha. Confira se ela segue a estrutura do template.";

export default function Painel() {
  const [aba, setAba] = useState<Aba>("vendas");

  const [vendas, setVendas] = useState<VendasData | null>(null);
  const [arqVendas, setArqVendas] = useState<string | null>(null);
  const [erroVendas, setErroVendas] = useState<string | null>(null);

  const [clientes, setClientes] = useState<ClientesData | null>(null);
  const [arqClientes, setArqClientes] = useState<string | null>(null);
  const [erroClientes, setErroClientes] = useState<string | null>(null);

  const [evento, setEvento] = useState<EventoData | null>(null);
  const [arqEvento, setArqEvento] = useState<string | null>(null);
  const [erroEvento, setErroEvento] = useState<string | null>(null);

  async function ler<T>(
    file: File,
    parse: (b: ArrayBuffer) => T,
    ok: (d: T) => void,
    falha: (m: string | null) => void,
    nome: (n: string | null) => void
  ) {
    try {
      const dados = parse(await file.arrayBuffer());
      ok(dados);
      nome(file.name);
      falha(null);
    } catch (e) {
      ok(null as T);
      nome(null);
      falha(e instanceof Error && e.message ? e.message : ERRO_GENERICO);
    }
  }

  const baixar = (wb: XLSX.WorkBook, nome: string) => XLSX.writeFile(wb, nome);

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-[1360px] px-4 pb-24 sm:px-8">
      <header className="relative flex flex-wrap items-end justify-between gap-6 pt-10 pb-8 sm:pt-14">
        <div className="flex items-center gap-4">
          <Marca size={52} />
          <div>
            <p className="font-display text-[2.1rem] leading-none text-cream">Fazendinha</p>
            <p className="font-display mt-1 text-[0.82rem] tracking-[0.42em] text-gold uppercase">
              Resort Privé
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="eyebrow">Painel de conversão</p>
          <p className="mt-1.5 text-[0.85rem] text-muted">
            {vendas ? vendas.mes.toLowerCase() : "vendas e fluxo de clientes"}
          </p>
          <form action={sair} className="mt-3">
            <button className="text-[0.78rem] tracking-[0.14em] text-muted uppercase transition-colors hover:text-cream">
              Sair
            </button>
          </form>
        </div>
      </header>

      <div className="hairline" />

      <nav className="flex flex-wrap gap-x-10 gap-y-3 py-6" aria-label="Seções do painel">
        {ABAS.map((t) => {
          const ativa = aba === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setAba(t.id)}
              aria-current={ativa ? "page" : undefined}
              className="group text-left"
            >
              <span
                className={`font-display block text-[1.7rem] leading-tight transition-colors sm:text-[2rem] ${
                  ativa ? "text-cream" : "text-muted/70 group-hover:text-cream/80"
                }`}
              >
                {t.nome}
              </span>
              <span
                className={`mt-1 block text-[0.78rem] tracking-[0.14em] uppercase transition-colors ${
                  ativa ? "text-gold" : "text-muted/50 group-hover:text-muted"
                }`}
              >
                {t.nota}
              </span>
              <span
                className={`mt-2 block h-px origin-left transition-transform duration-500 ${
                  ativa ? "scale-x-100 bg-gold" : "scale-x-0 bg-gold-dim"
                }`}
              />
            </button>
          );
        })}
      </nav>

      {aba === "vendas" && (
        <section key="vendas" className="rise space-y-5">
          <Fonte
            titulo="Envie a planilha de conversão de vendas"
            descricao="Uma aba por semana e uma de fechamento, com total de clientes, faturamento e ticket médio de 2024, 2025 e 2026."
            arquivo={arqVendas}
            erro={erroVendas}
            onArquivo={(f) =>
              ler(f, parseVendas, setVendas, setErroVendas, setArqVendas)
            }
            onTemplate={() => baixar(templateVendas(), "template-conversao-de-vendas.xlsx")}
          />
          {vendas && <SecaoVendas dados={vendas} />}
        </section>
      )}

      {aba === "clientes" && (
        <section key="clientes" className="rise space-y-5">
          <Fonte
            titulo="Envie a planilha de fluxo de clientes"
            descricao="Uma aba por mês, com a meta diária e os clientes de cada dia no clube da tarde e no clube da noite."
            arquivo={arqClientes}
            erro={erroClientes}
            onArquivo={(f) =>
              ler(f, parseClientes, setClientes, setErroClientes, setArqClientes)
            }
            onTemplate={() => baixar(templateClientes(), "template-conversao-de-clientes.xlsx")}
          />
          {clientes && <SecaoClientes dados={clientes} />}
        </section>
      )}

      {aba === "evento" && (
        <section key="evento" className="rise space-y-5">
          <Fonte
            titulo="Envie a planilha de gestão do evento"
            descricao="Uma aba de ROI com a ficha técnica, a meta de público e as despesas; outra de acompanhamento com a venda diária de cada lote por canal."
            arquivo={arqEvento}
            erro={erroEvento}
            onArquivo={(f) => ler(f, parseEvento, setEvento, setErroEvento, setArqEvento)}
            onTemplate={() => baixar(templateEvento(), "template-gestao-de-evento.xlsx")}
          />
          {evento && <SecaoEvento dados={evento} />}
        </section>
      )}
    </main>
  );
}

