"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ANOS, type Ano, type VendasData, variacao } from "@/lib/vendas";
import {
  brl,
  brlCurto,
  C,
  CORES_ANO,
  dataCurta,
  dec,
  Delta,
  eixo,
  gridProps,
  int,
  Legenda,
  Panel,
  pct,
  Stat,
  Tip,
} from "./ui";

const LEGENDA = ANOS.map((a) => ({ nome: String(a), cor: CORES_ANO[a] }));

const METRICAS = {
  clientes: { rotulo: "Clientes", fmt: (v: number) => int(v) },
  faturamento: { rotulo: "Faturamento", fmt: (v: number) => brl(v) },
  ticket: { rotulo: "Ticket médio", fmt: (v: number) => brl(v) },
} as const;
type Metrica = keyof typeof METRICAS;

export function SecaoVendas({ dados }: { dados: VendasData }) {
  const [metrica, setMetrica] = useState<Metrica>("faturamento");

  const semanas = useMemo(
    () =>
      dados.periodos.map((p) => ({
        curto: p.label.replace("Semana ", "S"),
        label: p.label,
        periodo: p.intervalos[2026] ?? p.intervalos[2025] ?? p.intervalos[2024] ?? null,
        clientes: p.clientes,
        faturamento: p.faturamento,
        ticket: p.ticket,
        d2425: variacao(p[metrica], 2024, 2025),
        d2526: variacao(p[metrica], 2025, 2026),
      })),
    [dados, metrica]
  );

  const f = dados.fechamento;
  const serie = (chave: "clientes" | "faturamento" | "ticket") =>
    semanas.map((s) => ({ curto: s.curto, label: s.label, ...s[chave] }));

  // Barras do cartão: o ano que o número grande mostra — 2026 quando já há dados.
  const anoBase: Ano = dados.periodos.some((p) => p.faturamento[2026] !== null || p.clientes[2026] !== null)
    ? 2026
    : 2025;
  const barras = (chave: "clientes" | "faturamento" | "ticket") =>
    semanas.map((s) => ({ curto: s.curto, label: s.label, valor: s[chave][anoBase] }));

  const tituloSemana = (l: string | number) => {
    const s = semanas.find((x) => x.curto === l);
    if (!s) return String(l);
    return s.periodo?.de ? `${s.label} · ${dataCurta(s.periodo.de)}–${dataCurta(s.periodo.ate)}` : s.label;
  };

  return (
    <div className="space-y-5">
      {f && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Stat
            rotulo="Clientes no mês"
            valor={int(f.clientes[2026] ?? f.clientes[2025])}
            delta={<Delta v={variacao(f.clientes, 2025, 2026)} />}
            apoio={`2025: ${int(f.clientes[2025])} · 2024: ${int(f.clientes[2024])}`}
            semanas={barras("clientes")}
            fmt={int}
            cor={CORES_ANO[anoBase]}
          />
          <Stat
            rotulo="Faturamento no mês"
            valor={brl(f.faturamento[2026] ?? f.faturamento[2025])}
            delta={<Delta v={variacao(f.faturamento, 2025, 2026)} />}
            apoio={`2025: ${brl(f.faturamento[2025])}`}
            semanas={barras("faturamento")}
            fmt={brl}
            cor={CORES_ANO[anoBase]}
          />
          <Stat
            rotulo="Ticket médio"
            valor={brl(f.ticket[2026] ?? f.ticket[2025])}
            delta={<Delta v={variacao(f.ticket, 2025, 2026)} />}
            apoio={`2025: ${brl(f.ticket[2025])} · 2024: ${brl(f.ticket[2024])}`}
            semanas={barras("ticket")}
            fmt={brl}
            cor={CORES_ANO[anoBase]}
          />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          titulo="Clientes por semana"
          apoio="Quantidade atendida em cada semana, ano a ano."
          acao={<Legenda itens={LEGENDA} />}
        >
          <Barras dados={serie("clientes")} fmt={int} titulo={tituloSemana} />
        </Panel>

        <Panel
          titulo="Faturamento por semana"
          apoio="Receita registrada na mesma janela de cada ano."
          acao={<Legenda itens={LEGENDA} />}
        >
          <Barras dados={serie("faturamento")} fmt={brl} eixoFmt={brlCurto} titulo={tituloSemana} />
        </Panel>
      </div>

      <Panel
        titulo="Ticket médio por semana"
        apoio="Faturamento dividido pelos clientes da semana — a linha mostra o valor por cliente."
        acao={<Legenda itens={LEGENDA} />}
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={serie("ticket")} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="curto" {...eixo} />
            <YAxis {...eixo} width={64} tickFormatter={(v) => brlCurto(Number(v))} />
            <Tooltip
              cursor={{ stroke: C.line }}
              content={<Tip fmt={brl} titulo={tituloSemana} />}
            />
            {ANOS.map((ano) => (
              <Line
                key={ano}
                type="monotone"
                dataKey={String(ano)}
                name={String(ano)}
                stroke={CORES_ANO[ano]}
                strokeWidth={ano === 2026 ? 2.5 : 1.75}
                dot={{ r: 3.5, strokeWidth: 0, fill: CORES_ANO[ano] }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      <Panel
        titulo="Variação entre anos"
        apoio="Crescimento de cada semana em relação ao mesmo período do ano anterior."
        acao={
          <div className="flex gap-1 rounded-full border border-line/70 p-1">
            {(Object.keys(METRICAS) as Metrica[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetrica(m)}
                className={`rounded-full px-4 py-1.5 text-[0.8rem] transition-colors ${
                  metrica === m ? "bg-gold text-ink" : "text-muted hover:text-cream"
                }`}
              >
                {METRICAS[m].rotulo}
              </button>
            ))}
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={290}>
          <BarChart data={semanas} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="curto" {...eixo} />
            <YAxis
              {...eixo}
              width={56}
              tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
            />
            <ReferenceLine y={0} stroke={C.line} />
            <Tooltip
              cursor={{ fill: "rgba(198,150,48,0.06)" }}
              content={<Tip fmt={(v) => pct(v)} titulo={tituloSemana} />}
            />
            <Bar dataKey="d2425" name="2024 → 2025" radius={[6, 6, 0, 0]} maxBarSize={64}>
              {semanas.map((s, i) => (
                <Cell key={i} fill={(s.d2425 ?? 0) >= 0 ? C.gold : C.wineDeep} />
              ))}
            </Bar>
            <Bar dataKey="d2526" name="2025 → 2026" radius={[6, 6, 0, 0]} maxBarSize={64}>
              {semanas.map((s, i) => (
                <Cell key={i} fill={(s.d2526 ?? 0) >= 0 ? C.goldSoft : C.wine} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-4 text-[0.8rem] text-muted">
          Barras claras comparam 2025 com 2026; as escuras, 2024 com 2025. Tons de vinho indicam queda.
        </p>
      </Panel>

      {f && <Fechamento dados={dados} />}
    </div>
  );
}

function Barras({
  dados,
  fmt,
  eixoFmt,
  titulo,
}: {
  dados: Record<string, unknown>[];
  fmt: (v: number) => string;
  eixoFmt?: (v: number) => string;
  titulo: (l: string | number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={dados} margin={{ top: 8, right: 12, left: 4, bottom: 4 }} barGap={3}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="curto" {...eixo} />
        <YAxis
          {...eixo}
          width={eixoFmt ? 64 : 48}
          tickFormatter={(v) => (eixoFmt ? eixoFmt(Number(v)) : int(Number(v)))}
        />
        <Tooltip cursor={{ fill: "rgba(198,150,48,0.06)" }} content={<Tip fmt={fmt} titulo={titulo} />} />
        {ANOS.map((ano) => (
          <Bar
            key={ano}
            dataKey={String(ano)}
            name={String(ano)}
            fill={CORES_ANO[ano]}
            radius={[6, 6, 0, 0]}
            maxBarSize={26}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function Fechamento({ dados }: { dados: VendasData }) {
  const f = dados.fechamento!;
  const anos = ANOS.filter((a) => f.clientes[a] !== null || f.faturamento[a] !== null);
  const alvo = f.faturamento[2025];
  const realizado = f.faturamento[2026];

  return (
    <Panel
      titulo={`Fechamento · ${dados.mes.toLowerCase()}`}
      apoio="O acumulado do mês frente ao mesmo mês do ano anterior."
    >
      <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-[0.9rem]">
            <thead>
              <tr className="border-b border-line/70 text-muted">
                <th className="pb-3 font-normal">Referência</th>
                {anos.map((a) => (
                  <th key={a} className="pb-3 text-right font-normal" style={{ color: CORES_ANO[a] }}>
                    {a}
                  </th>
                ))}
                <th className="pb-3 text-right font-normal">2025 → 2026</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {(
                [
                  ["Total de clientes", f.clientes, int],
                  ["Faturamento", f.faturamento, brl],
                  ["Ticket médio", f.ticket, brl],
                ] as [string, Record<Ano, number | null>, (v: number | null) => string][]
              ).map(([nome, valores, fmt]) => (
                <tr key={nome}>
                  <td className="py-3 text-cream">{nome}</td>
                  {anos.map((a) => (
                    <td key={a} className="num py-3 text-right text-cream/90">
                      {fmt(valores[a])}
                    </td>
                  ))}
                  <td className="py-3 text-right">
                    <Delta v={variacao(valores, 2025, 2026)} />
                  </td>
                </tr>
              ))}
              <tr>
                <td className="py-3 text-muted">Janela comparada</td>
                {anos.map((a) => (
                  <td key={a} className="py-3 text-right text-[0.82rem] text-muted">
                    {f.intervalos[a]?.de
                      ? `${dataCurta(f.intervalos[a]!.de)} – ${dataCurta(f.intervalos[a]!.ate)}`
                      : "—"}
                  </td>
                ))}
                <td />
              </tr>
            </tbody>
          </table>
        <p className="mt-4 text-[0.8rem] text-muted">
          2026 já cobre {dec(realizado !== null && alvo ? (realizado / alvo) * 100 : null, 1)}% do
          faturamento total de 2025 — compare sempre janelas equivalentes.
        </p>
      </div>
    </Panel>
  );
}
