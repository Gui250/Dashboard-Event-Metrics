"use client";

import { useState } from "react";
import { CLUBES, type ClientesData, type Clube } from "@/lib/clientes";
import { CORES_CLUBE, dec, int, Panel } from "./ui";

const NOME: Record<Clube, string> = { tarde: "Clube da tarde", noite: "Clube da noite" };

type Linha = {
  rotulo: string;
  completo: string;
  tarde: number | null;
  noite: number | null;
  diasNaMeta: number;
  dias: number;
  resumo: boolean;
};

const mediaDe = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

/**
 * Dumbbell: uma linha por mês, um ponto por clube, a distância entre eles é a
 * diferença. Substitui a dispersão tarde × noite, que pedia do leitor uma
 * correlação — enquanto a pergunta real é "qual clube traz mais gente, e quanto".
 */
export function TardeNoite({ dados }: { dados: ClientesData }) {
  const [tabela, setTabela] = useState(false);
  const meta = dados.meta;

  const linhas: Linha[] = dados.meses.map((m) => {
    const todos = m.dias.flatMap((d) => CLUBES.map((c) => d[c]));
    return {
      rotulo: m.nome.replace(/\s*\d{4}$/, "").slice(0, 3),
      completo: m.nome,
      tarde: m.media.tarde,
      noite: m.media.noite,
      diasNaMeta: todos.filter((v) => v !== null && v >= meta).length,
      dias: todos.filter((v) => v !== null).length,
      resumo: false,
    };
  });

  const geral: Linha = {
    rotulo: "Geral",
    completo: "Média das médias mensais",
    tarde: dados.mediaGeral.tarde,
    noite: dados.mediaGeral.noite,
    diasNaMeta: linhas.reduce((a, l) => a + l.diasNaMeta, 0),
    dias: linhas.reduce((a, l) => a + l.dias, 0),
    resumo: true,
  };

  const teto = Math.max(meta, ...linhas.flatMap((l) => [l.tarde ?? 0, l.noite ?? 0])) * 1.06;
  const pos = (v: number) => (v / teto) * 100;

  const vantagem = mediaDe(linhas.map((l) => (l.tarde !== null && l.noite !== null ? l.tarde - l.noite : null)));

  return (
    <Panel
      titulo="Tarde × noite"
      apoio={`Média de clientes por dia em cada mês. A distância entre os pontos é a diferença entre os clubes.`}
      acao={
        <div className="flex items-center gap-5">
          <ul className={`flex items-center gap-4 ${tabela ? "hidden" : ""}`}>
            {CLUBES.map((c) => (
              <li key={c} className="flex items-center gap-2 text-[0.8rem] text-muted">
                <span className="size-2.5 rounded-full" style={{ background: CORES_CLUBE[c] }} aria-hidden />
                {NOME[c]}
              </li>
            ))}
          </ul>
          <div className="flex gap-1 rounded-full border border-line/70 p-1">
            {[false, true].map((t) => (
              <button
                key={String(t)}
                onClick={() => setTabela(t)}
                aria-pressed={tabela === t}
                className={`rounded-full px-3.5 py-1.5 text-[0.78rem] transition-colors ${
                  tabela === t ? "bg-gold text-ink" : "text-muted hover:text-cream"
                }`}
              >
                {t ? "Tabela" : "Gráfico"}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {tabela ? (
        <Tabela linhas={[...linhas, geral]} />
      ) : (
        <>
          <div className="grid grid-cols-[3.5rem_1fr_5.5rem] items-center gap-x-4 pb-2 sm:grid-cols-[5rem_1fr_7rem]">
            <span />
            <span className="relative block h-4">
              <span
                className="absolute -top-0.5 text-[0.7rem] tracking-[0.18em] whitespace-nowrap text-muted uppercase"
                style={{ left: `${pos(meta)}%`, transform: "translateX(-50%)" }}
              >
                meta {int(meta)}
              </span>
            </span>
            <span className="text-right text-[0.7rem] tracking-[0.16em] text-muted uppercase">
              a mais
            </span>
          </div>

          <ul>
            {[...linhas, geral].map((l) => (
              <Dumbbell key={l.completo} linha={l} meta={meta} pos={pos} />
            ))}
          </ul>

          <p className="mt-5 text-[0.85rem] text-muted">
            {vantagem === null
              ? "Sem meses com os dois clubes preenchidos."
              : `O clube da tarde recebe, em média, ${dec(vantagem)} clientes a mais por dia. ${
                  linhas.some((l) => (l.tarde ?? 0) >= meta || (l.noite ?? 0) >= meta)
                    ? `Há meses com média na meta de ${int(meta)}.`
                    : `Nenhum dos dois alcançou a meta de ${int(meta)} em nenhum mês.`
                }`}
          </p>
        </>
      )}
    </Panel>
  );
}

function Dumbbell({
  linha,
  meta,
  pos,
}: {
  linha: Linha;
  meta: number;
  pos: (v: number) => number;
}) {
  const { tarde, noite } = linha;
  const diff = tarde !== null && noite !== null ? tarde - noite : null;
  const min = Math.min(tarde ?? Infinity, noite ?? Infinity);
  const max = Math.max(tarde ?? -Infinity, noite ?? -Infinity);

  return (
    <li
      tabIndex={0}
      className={`group grid grid-cols-[3.5rem_1fr_5.5rem] items-center gap-x-4 rounded-2xl py-1.5 transition-colors hover:bg-cream/4 focus-visible:bg-cream/4 sm:grid-cols-[5rem_1fr_7rem] ${
        linha.resumo ? "mt-2 border-t border-line/60 pt-4" : ""
      }`}
      aria-label={`${linha.completo}: tarde ${dec(tarde)}, noite ${dec(noite)} clientes por dia`}
    >
      <span
        className={`text-[0.78rem] tracking-[0.16em] uppercase ${
          linha.resumo ? "text-cream" : "text-muted"
        }`}
      >
        {linha.rotulo}
      </span>

      <span className="relative block h-9">
        {/* limiar da meta — tracejado porque é um limite, não uma grade */}
        <span
          className="absolute inset-y-0 w-px border-l border-dashed border-cream/35"
          style={{ left: `${pos(meta)}%` }}
          aria-hidden
        />
        {diff !== null && (
          <span
            className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-cream/20"
            style={{ left: `${pos(min)}%`, width: `${pos(max) - pos(min)}%` }}
            aria-hidden
          />
        )}
        {CLUBES.map((c) => {
          const v = linha[c];
          if (v === null) return null;
          return (
            <span key={c} className="absolute top-1/2" style={{ left: `${pos(v)}%` }}>
              <span
                className="block size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
                style={{ background: CORES_CLUBE[c] }}
                aria-hidden
              />
              <span
                className={`num absolute -top-5 left-0 -translate-x-1/2 text-[0.78rem] whitespace-nowrap text-cream transition-opacity ${
                  linha.resumo
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                }`}
              >
                {dec(v)}
              </span>
            </span>
          );
        })}
      </span>

      <span className="num text-right text-[0.9rem] text-cream/85">
        {diff === null ? "—" : `${diff > 0 ? "+" : ""}${dec(diff)}`}
      </span>
    </li>
  );
}

function Tabela({ linhas }: { linhas: Linha[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[460px] text-left text-[0.9rem]">
        <thead>
          <tr className="border-b border-line/70 text-muted">
            <th className="pb-3 font-normal">Mês</th>
            <th className="pb-3 text-right font-normal">Tarde</th>
            <th className="pb-3 text-right font-normal">Noite</th>
            <th className="pb-3 text-right font-normal">Diferença</th>
            <th className="pb-3 text-right font-normal">Dias na meta</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/40">
          {linhas.map((l) => (
            <tr key={l.completo} className={l.resumo ? "text-cream" : "text-cream/85"}>
              <td className="py-3">{l.completo}</td>
              <td className="num py-3 text-right">{dec(l.tarde)}</td>
              <td className="num py-3 text-right">{dec(l.noite)}</td>
              <td className="num py-3 text-right">
                {l.tarde !== null && l.noite !== null ? dec(l.tarde - l.noite) : "—"}
              </td>
              <td className="num py-3 text-right">
                {l.diasNaMeta} <span className="text-muted">de {l.dias}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
