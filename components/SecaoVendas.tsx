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
  Clicavel,
  Delta,
  eixo,
  Filtro,
  Filtros,
  gridProps,
  int,
  Legenda,
  type Nota,
  notaDe,
  Notas,
  Panel,
  pct,
  Stat,
  Tip,
  useObservacoes,
} from "./ui";

const LEGENDA = ANOS.map((a) => ({ nome: String(a), cor: CORES_ANO[a] }));
const CAMPO_NOTA = "nota-vendas";

const METRICAS = {
  clientes: { rotulo: "Clientes", fmt: (v: number) => int(v) },
  faturamento: { rotulo: "Faturamento", fmt: (v: number) => brl(v) },
  ticket: { rotulo: "Ticket médio", fmt: (v: number) => brl(v) },
} as const;
type Metrica = keyof typeof METRICAS;

export function SecaoVendas({ dados }: { dados: VendasData }) {
  const [metrica, setMetrica] = useState<Metrica>("faturamento");
  const [anos, setAnos] = useState<Ano[]>([...ANOS]);
  const [sems, setSems] = useState(() => dados.periodos.map((p) => p.label));
  const obs = useObservacoes(`vendas:${dados.mes}`);
  const [alvo, setAlvo] = useState("");

  const semanas = useMemo(
    () =>
      dados.periodos.map((p) => ({
        curto: p.label.replace("Semana ", "S"),
        label: p.label,
        periodo: p.intervalos[2026] ?? p.intervalos[2025] ?? p.intervalos[2024] ?? null,
        clientes: p.clientes,
        faturamento: p.faturamento,
        ticket: p.ticket,
        observacao: p.observacao,
        d2425: variacao(p[metrica], 2024, 2025),
        d2526: variacao(p[metrica], 2025, 2026),
      })),
    [dados, metrica]
  );

  const f = dados.fechamento;
  const visiveis = semanas.filter((s) => sems.includes(s.label));
  const serie = (chave: "clientes" | "faturamento" | "ticket") =>
    visiveis.map((s) => ({ curto: s.curto, label: s.label, ...s[chave] }));
  const legenda = LEGENDA.filter((l) => anos.includes(Number(l.nome) as Ano));
  const par = (a: Ano, b: Ano) => anos.includes(a) && anos.includes(b);

  // Barras do cartão: o ano que o número grande mostra — 2026 quando já há dados.
  const anoBase: Ano = dados.periodos.some((p) => p.faturamento[2026] !== null || p.clientes[2026] !== null)
    ? 2026
    : 2025;
  const barras = (chave: "clientes" | "faturamento" | "ticket") =>
    semanas.map((s) => ({ curto: s.curto, label: s.label, valor: s[chave][anoBase] }));

  const planilha: Nota[] = [...semanas.map((s) => ({ chave: s.curto, texto: s.observacao })),
    { chave: "Fechamento", texto: f?.observacao ?? null }]
    .filter((n): n is Nota => !!n.texto);
  const notaSemana = (l: string | number) => notaDe([...planilha, ...obs.itens], l);
  const anotar = (l: string | number | undefined) => {
    if (l === undefined) return;
    setAlvo(String(l));
    document.getElementById(CAMPO_NOTA)?.focus();
  };

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

      <Filtros>
        <Filtro
          rotulo="Semanas"
          opcoes={semanas.map((s) => ({ v: s.label, nome: s.curto }))}
          sel={sems}
          onSel={setSems}
        />
        <Filtro
          rotulo="Anos"
          opcoes={ANOS.map((a) => ({ v: a, nome: String(a) }))}
          sel={anos}
          onSel={setAnos}
        />
      </Filtros>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          titulo="Clientes por semana"
          apoio="Quantidade atendida em cada semana, ano a ano."
          acao={<Legenda itens={legenda} />}
        >
          <Barras
            dados={serie("clientes")}
            anos={anos}
            fmt={int}
            titulo={tituloSemana}
            nota={notaSemana}
            onClick={anotar}
          />
        </Panel>

        <Panel
          titulo="Faturamento por semana"
          apoio="Receita registrada na mesma janela de cada ano."
          acao={<Legenda itens={legenda} />}
        >
          <Barras
            dados={serie("faturamento")}
            anos={anos}
            fmt={brl}
            eixoFmt={brlCurto}
            titulo={tituloSemana}
            nota={notaSemana}
            onClick={anotar}
          />
        </Panel>
      </div>

      <Panel
        titulo="Ticket médio por semana"
        apoio="Faturamento dividido pelos clientes da semana — a linha mostra o valor por cliente."
        acao={<Legenda itens={legenda} />}
      >
        <Clicavel>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={serie("ticket")}
              margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
              onClick={(e) => anotar(e.activeLabel)}
            >
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="curto" {...eixo} />
              <YAxis {...eixo} width={64} tickFormatter={(v) => brlCurto(Number(v))} />
              <Tooltip
                cursor={{ stroke: C.line }}
                content={<Tip fmt={brl} titulo={tituloSemana} nota={notaSemana} />}
              />
              {anos.map((ano) => (
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
        </Clicavel>
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
        {par(2024, 2025) || par(2025, 2026) ? (
          <>
            <Clicavel>
              <ResponsiveContainer width="100%" height={290}>
                <BarChart
                  data={visiveis}
                  margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
                  onClick={(e) => anotar(e.activeLabel)}
                >
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
                    content={<Tip fmt={(v) => pct(v)} titulo={tituloSemana} nota={notaSemana} />}
                  />
                  {par(2024, 2025) && (
                    <Bar dataKey="d2425" name="2024 → 2025" radius={[6, 6, 0, 0]} maxBarSize={64}>
                      {visiveis.map((s, i) => (
                        <Cell key={i} fill={(s.d2425 ?? 0) >= 0 ? C.gold : C.wineDeep} />
                      ))}
                    </Bar>
                  )}
                  {par(2025, 2026) && (
                    <Bar dataKey="d2526" name="2025 → 2026" radius={[6, 6, 0, 0]} maxBarSize={64}>
                      {visiveis.map((s, i) => (
                        <Cell key={i} fill={(s.d2526 ?? 0) >= 0 ? C.goldSoft : C.wine} />
                      ))}
                    </Bar>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </Clicavel>
            <p className="mt-4 text-[0.8rem] text-muted">
              Barras claras comparam 2025 com 2026; as escuras, 2024 com 2025. Tons de vinho indicam queda.
            </p>
          </>
        ) : (
          <p className="py-10 text-center text-[0.85rem] text-muted">
            Marque dois anos seguidos no filtro para ver a variação.
          </p>
        )}
        <Notas
          id={CAMPO_NOTA}
          planilha={planilha}
          obs={obs}
          opcoes={[
            ...semanas.map((s) => ({ chave: s.curto, nome: s.label })),
            { chave: "Fechamento", nome: "Fechamento" },
          ]}
          alvo={alvo}
          onAlvo={setAlvo}
        />
      </Panel>

      {f && <Fechamento dados={dados} anosSel={anos} />}
    </div>
  );
}

function Barras({
  dados,
  anos,
  fmt,
  eixoFmt,
  titulo,
  nota,
  onClick,
}: {
  dados: Record<string, unknown>[];
  anos: Ano[];
  fmt: (v: number) => string;
  eixoFmt?: (v: number) => string;
  titulo: (l: string | number) => string;
  nota?: (l: string | number) => string | null;
  onClick: (l: string | number | undefined) => void;
}) {
  return (
    <Clicavel>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={dados}
          margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
          barGap={3}
          onClick={(e) => onClick(e.activeLabel)}
        >
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="curto" {...eixo} />
          <YAxis
            {...eixo}
            width={eixoFmt ? 64 : 48}
            tickFormatter={(v) => (eixoFmt ? eixoFmt(Number(v)) : int(Number(v)))}
          />
          <Tooltip
            cursor={{ fill: "rgba(198,150,48,0.06)" }}
            content={<Tip fmt={fmt} titulo={titulo} nota={nota} />}
          />
          {anos.map((ano) => (
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
    </Clicavel>
  );
}

function Fechamento({ dados, anosSel }: { dados: VendasData; anosSel: Ano[] }) {
  const f = dados.fechamento!;
  const anos = anosSel.filter((a) => f.clientes[a] !== null || f.faturamento[a] !== null);
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
