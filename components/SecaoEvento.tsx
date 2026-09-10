"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CANAIS, type EventoData, NOME_CANAL, resumo } from "@/lib/evento";
import {
  Anel,
  brl,
  brlCurto,
  C,
  dataCurta,
  dec,
  Delta,
  eixo,
  gridProps,
  int,
  Legenda,
  Panel,
  RAMPA_OURO,
  Stat,
  Tip,
} from "./ui";

const DIA_MS = 86400000;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const ms = (data: string) => Date.parse(data + "T00:00:00Z");
const ddmm = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}`;

const dataLonga = (data: string | null) =>
  data
    ? new Date(data + "T12:00:00Z").toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : "—";

export function SecaoEvento({ dados }: { dados: EventoData }) {
  const r = useMemo(() => resumo(dados), [dados]);

  const corLote = (i: number) => RAMPA_OURO[i % RAMPA_OURO.length];
  const legendaLotes = r.porLote.map((l, i) => ({ nome: l.label, cor: corLote(i) }));

  // Uma linha por dia da janela de venda, mesmo os dias sem venda: é o vazio
  // entre as vendas que mostra o ritmo real.
  const ritmo = useMemo(() => {
    if (!r.inicio || !r.fim) return [];
    const dias = Math.round((ms(r.fim) - ms(r.inicio)) / DIA_MS) + 1;
    const porDia = new Map<string, number>();
    for (const lote of dados.lotes)
      for (const d of lote.dias)
        porDia.set(d.data, (porDia.get(d.data) ?? 0) + CANAIS.reduce((a, c) => a + d[c], 0));

    let acumulado = 0;
    return Array.from({ length: dias }, (_, i) => {
      const data = iso(ms(r.inicio!) + i * DIA_MS);
      acumulado += porDia.get(data) ?? 0;
      return {
        data,
        curto: ddmm(data),
        vendido: r.ultimoDia && data <= r.ultimoDia ? acumulado : null,
        necessario: (dados.meta.publico * (i + 1)) / dias,
      };
    });
  }, [dados, r]);

  const porCanal = CANAIS.map((canal) => {
    const linha: Record<string, string | number> = { canal: NOME_CANAL[canal] };
    r.porLote.forEach((l) => (linha[l.label] = l.canais[canal]));
    return linha;
  });

  // A contagem regressiva lê o relógio uma vez, na montagem: o painel é aberto
  // por dia, e um valor fixo evita o número dançar entre renders.
  const [hoje] = useState(() => iso(Date.now()));

  const ate = (alvo: string | null) =>
    alvo ? Math.ceil((ms(alvo) - ms(hoje)) / DIA_MS) : null;
  const faltam = ate(dados.dataEvento);
  const faltamVenda = ate(r.fim);

  const restante = dados.meta.publico - r.pax;
  const porDiaNecessario =
    faltamVenda && faltamVenda > 0 ? restante / faltamVenda : null;
  const paraPagar = r.ticket && r.ticket > 0 ? Math.ceil(r.investimento / r.ticket) : null;

  return (
    <div className="space-y-5">
      <Panel
        titulo={dados.evento}
        apoio={
          <>
            {dados.atracao ? `${dados.atracao} · ` : ""}
            {dataLonga(dados.dataEvento)}
          </>
        }
        acao={
          faltam !== null && (
            <div className="text-right">
              <p className="fig text-[2.4rem] leading-none text-gold-soft">
                {faltam > 0 ? faltam : 0}
              </p>
              <p className="mt-1 text-[0.72rem] tracking-[0.18em] text-muted uppercase">
                {faltam === 1 ? "dia para o evento" : "dias para o evento"}
              </p>
            </div>
          )
        }
      >
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 py-2">
          <Anel
            valor={r.pax}
            meta={dados.meta.publico}
            rotulo="Público pagante"
            cor={C.gold}
            fmt={int}
            apoio={`${int(restante)} ingressos para a meta`}
          />
          <dl className="grid min-w-[15rem] max-w-[32rem] flex-1 gap-x-10 gap-y-5 sm:grid-cols-2">
            {r.porLote.map((l, i) => (
              <div key={l.label}>
                <dt className="flex items-center gap-2 text-[0.78rem] text-muted">
                  <span className="size-2.5 rounded-full" style={{ background: corLote(i) }} aria-hidden />
                  {l.label.toLowerCase()}
                </dt>
                <dd className="num mt-1.5 text-[1.35rem] text-cream">
                  {int(l.pax)}
                  <span className="ml-2 text-[0.8rem] text-muted">
                    {l.preco ? `a ${brl(l.preco)}` : "sem preço"}
                  </span>
                </dd>
              </div>
            ))}
            <div>
              <dt className="text-[0.78rem] text-muted">Venda aberta até</dt>
              <dd className="num mt-1.5 text-[1.35rem] text-cream">
                {dataCurta(r.fim)}
                {faltamVenda !== null && faltamVenda > 0 && (
                  <span className="ml-2 text-[0.8rem] text-muted">
                    {faltamVenda} {faltamVenda === 1 ? "dia" : "dias"}
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-3">
        <Stat
          rotulo="Faturamento"
          valor={brl(r.faturamento)}
          delta={<Delta v={r.metaFaturamento ? r.faturamento / r.metaFaturamento - 1 : null} />}
          apoio={`meta ${brl(r.metaFaturamento)}`}
        />
        <Stat
          rotulo="Ticket médio"
          valor={brl(r.ticket)}
          delta={
            <Delta v={dados.meta.ticket && r.ticket ? r.ticket / dados.meta.ticket - 1 : null} />
          }
          apoio={`meta ${brl(dados.meta.ticket)}`}
        />
        <Stat
          rotulo="Payback"
          valor={brl(r.payback)}
          apoio={`${brl(r.investimento)} investidos`}
        />
      </div>

      <Panel
        titulo="Ritmo de venda"
        apoio={`Ingressos acumulados dia a dia. A linha tracejada é o ritmo que fecha os ${int(
          dados.meta.publico
        )} até ${dataCurta(r.fim)}`}
      >
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={ritmo} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="curto" {...eixo} interval="preserveStartEnd" minTickGap={28} />
            <YAxis {...eixo} width={48} domain={[0, dados.meta.publico]} />
            <Tooltip
              cursor={{ stroke: C.line }}
              content={
                <Tip
                  fmt={(v) => int(Math.round(v))}
                  titulo={(l) => {
                    const d = ritmo.find((x) => x.curto === l);
                    return d ? dataLonga(d.data) : String(l);
                  }}
                />
              }
            />
            <Line
              type="linear"
              dataKey="necessario"
              name="Ritmo necessário"
              stroke={C.cream}
              strokeOpacity={0.5}
              strokeWidth={2}
              strokeDasharray="4 6"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="vendido"
              name="Vendido"
              stroke={C.gold}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            {r.inicio && r.fim && hoje >= r.inicio && hoje <= r.fim && (
              <ReferenceLine x={ddmm(hoje)} stroke={C.line}>
                <Label value="hoje" position="insideTopLeft" fill={C.muted} fontSize={11} />
              </ReferenceLine>
            )}
          </LineChart>
        </ResponsiveContainer>
        <p className="mt-4 text-[0.8rem] text-muted">
          {porDiaNecessario === null
            ? "A venda já fechou."
            : `Faltam ${int(restante)} ingressos em ${faltamVenda} ${
                faltamVenda === 1 ? "dia" : "dias"
              } — ${int(Math.ceil(porDiaNecessario))} por dia, contra os ${dec(
                r.pax / (ritmo.filter((d) => d.vendido !== null).length || 1)
              )} por dia vendidos até aqui.`}
        </p>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          titulo="De onde vem a venda"
          apoio="Ingressos por canal, lote a lote."
          acao={<Legenda itens={legendaLotes} />}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={porCanal} margin={{ top: 8, right: 12, left: 4, bottom: 4 }} barGap={3}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="canal" {...eixo} />
              <YAxis {...eixo} width={40} allowDecimals={false} />
              <Tooltip cursor={{ fill: "rgba(198,150,48,0.06)" }} content={<Tip fmt={int} />} />
              {r.porLote.map((l, i) => (
                <Bar
                  key={l.label}
                  dataKey={l.label}
                  name={l.label}
                  fill={corLote(i)}
                  radius={[5, 5, 0, 0]}
                  maxBarSize={30}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-4 text-[0.8rem] text-muted">
            O 1º lote saiu no balcão dos clubes; o 3º, no digital. A troca de canal muda quem
            precisa ser avisado nos últimos dias.
          </p>
        </Panel>

        <Panel titulo="Investimento" apoio="Onde o dinheiro do evento foi comprometido.">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={dados.despesas}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 4, bottom: 4 }}
            >
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" {...eixo} tickFormatter={(v) => brlCurto(Number(v))} />
              <YAxis
                type="category"
                dataKey="rotulo"
                {...eixo}
                width={150}
                tick={{ fill: C.muted, fontSize: 11 }}
              />
              <Tooltip cursor={{ fill: "rgba(198,150,48,0.06)" }} content={<Tip fmt={brl} />} />
              <Bar dataKey="valor" name="Investido" fill={C.wine} radius={[0, 5, 5, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-4 text-[0.8rem] text-muted">
            {r.metaFaturamento > 0 && r.metaFaturamento < r.investimento ? (
              <>
                Mesmo com os {int(dados.meta.publico)} ingressos da meta, o faturamento previsto (
                {brl(r.metaFaturamento)}) fica {brl(r.investimento - r.metaFaturamento)} abaixo do
                investimento. O payback pede {int(paraPagar)} pagantes ao ticket de hoje.
              </>
            ) : (
              <>
                O payback pede {int(paraPagar)} pagantes ao ticket de hoje — {int(r.pax)} vendidos
                até agora.
              </>
            )}
          </p>
        </Panel>
      </div>
    </div>
  );
}
