"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CLUBES, type ClientesData, type Clube } from "@/lib/clientes";
import { TardeNoite } from "./TardeNoite";
import {
  Anel,
  C,
  CORES_CLUBE,
  dec,
  eixo,
  gridProps,
  int,
  Legenda,
  Panel,
  Stat,
  Tip,
} from "./ui";

const NOME: Record<Clube, string> = { tarde: "Clube da tarde", noite: "Clube da noite" };
const LEGENDA = CLUBES.map((c) => ({ nome: NOME[c], cor: CORES_CLUBE[c] }));

export function SecaoClientes({ dados }: { dados: ClientesData }) {
  const [mesIdx, setMesIdx] = useState(dados.meses.length - 1);
  const mes = dados.meses[Math.min(mesIdx, dados.meses.length - 1)];
  const meta = dados.meta;



  const acimaDaMeta = (clube: Clube) => {
    const vals = dados.meses.flatMap((m) =>
      m.dias.map((d) => d[clube]).filter((v): v is number => v !== null)
    );
    return { total: vals.length, acima: vals.filter((v) => v >= meta).length };
  };
  const tarde = acimaDaMeta("tarde");
  const noite = acimaDaMeta("noite");

  const melhorDia = useMemo(() => {
    let top = { valor: -1, texto: "—" };
    for (const m of dados.meses)
      for (const d of m.dias)
        for (const c of CLUBES) {
          const v = d[c];
          if (v !== null && v > top.valor)
            top = { valor: v, texto: `${d.dia} de ${m.nome.toLowerCase()} · ${NOME[c].toLowerCase()}` };
        }
    return top;
  }, [dados]);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <Panel
          titulo="Média realizada frente à meta"
          apoio={`Meta de ${int(meta)} clientes por dia, em ${dados.meses.length} ${
            dados.meses.length === 1 ? "mês" : "meses"
          } de operação.`}
        >
          <div className="flex flex-wrap items-start justify-center gap-10 py-2">
            {CLUBES.map((c) => (
              <Anel
                key={c}
                valor={dados.mediaGeral[c]}
                meta={meta}
                rotulo={NOME[c]}
                cor={CORES_CLUBE[c]}
              />
            ))}
          </div>
        </Panel>

        <div className="grid gap-5 sm:grid-cols-2">
          <Stat
            rotulo="Dias na meta · tarde"
            valor={`${tarde.acima}/${tarde.total}`}
            apoio={`${((tarde.acima / (tarde.total || 1)) * 100).toFixed(0)}% dos dias abertos`}
          />
          <Stat
            rotulo="Dias na meta · noite"
            valor={`${noite.acima}/${noite.total}`}
            apoio={`${((noite.acima / (noite.total || 1)) * 100).toFixed(0)}% dos dias abertos`}
          />
          <Stat
            rotulo="Melhor dia"
            valor={int(melhorDia.valor)}
            apoio={melhorDia.texto}
          />
          <Stat
            rotulo="Diferença entre clubes"
            valor={dec(
              dados.mediaGeral.tarde !== null && dados.mediaGeral.noite !== null
                ? dados.mediaGeral.tarde - dados.mediaGeral.noite
                : null,
              1
            )}
            apoio="clientes a mais no clube da tarde, por dia"
          />
        </div>
      </div>

      <Panel
        titulo="Fluxo diário"
        apoio={`Cada dia de operação em ${mes.nome.toLowerCase()}. A linha marca a meta de ${int(meta)}.`}
        acao={
          <div className="flex flex-wrap gap-1 rounded-full border border-line/70 p-1">
            {dados.meses.map((m, i) => (
              <button
                key={m.nome}
                onClick={() => setMesIdx(i)}
                className={`rounded-full px-3.5 py-1.5 text-[0.78rem] transition-colors ${
                  i === mesIdx ? "bg-gold text-ink" : "text-muted hover:text-cream"
                }`}
              >
                {m.nome.replace(/\s*\d{4}$/, "")}
              </button>
            ))}
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={mes.dias} margin={{ top: 8, right: 12, left: 4, bottom: 4 }} barGap={2}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="dia" {...eixo} interval="preserveStartEnd" minTickGap={6} />
            <YAxis {...eixo} width={44} />
            <Tooltip
              cursor={{ fill: "rgba(198,150,48,0.06)" }}
              content={<Tip fmt={int} titulo={(l) => `Dia ${l} · ${mes.nome.toLowerCase()}`} />}
            />
            <ReferenceLine y={meta} stroke={C.cream} strokeDasharray="4 6" strokeOpacity={0.55}>
              <Label value={`meta ${meta}`} position="insideTopRight" fill={C.muted} fontSize={11} />
            </ReferenceLine>
            {CLUBES.map((c) => (
              <Bar
                key={c}
                dataKey={c}
                name={NOME[c]}
                fill={CORES_CLUBE[c]}
                radius={[5, 5, 0, 0]}
                maxBarSize={16}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Legenda itens={LEGENDA} />
          <p className="text-[0.8rem] text-muted">
            Média do mês — tarde {dec(mes.media.tarde)} · noite {dec(mes.media.noite)}
          </p>
        </div>
      </Panel>

      <TardeNoite dados={dados} />
    </div>
  );
}
