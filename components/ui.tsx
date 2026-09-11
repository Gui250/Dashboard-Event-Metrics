"use client";

import { type ReactNode, useState } from "react";

/* Paleta derivada do logo: ouro #C69630 e vinho #720006. */
export const C = {
  gold: "#c69630",
  goldSoft: "#e3c179",
  wine: "#c33d55",
  wineDeep: "#8c1024",
  taupe: "#8f7a6e",
  cream: "#f2e6d6",
  muted: "#a58a7d",
  line: "#3d252b",
  grid: "#2e1c21",
  surface: "#201317",
};

/*
 * Rampa ordinal de ouro — escuro para claro. Serve a qualquer escala com ordem
 * (anos, lotes): o passo mais recente é o mais brilhante.
 * Validada com scripts/validate_palette.js --ordinal --mode dark.
 */
export const RAMPA_OURO = ["#7d5b1c", "#ab8029", "#dcae4c"];

export const CORES_ANO: Record<number, string> = {
  2024: RAMPA_OURO[0],
  2025: RAMPA_OURO[1],
  2026: RAMPA_OURO[2],
};

/*
 * Clubes são identidade (categórica). Par validado no modo escuro:
 * ΔE 14,3 sob deuteranopia, 20,3 com visão plena.
 */
export const CORES_CLUBE = { tarde: "#b4882b", noite: "#b23a52" };

/* ---------- formatação ---------- */

const nfInt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const nfBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const nfCompact = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
});

export const int = (v: number | null) => (v === null ? "—" : nfInt.format(v));
export const brl = (v: number | null) => (v === null ? "—" : nfBRL.format(v));
export const brlCurto = (v: number) => `R$ ${nfCompact.format(v)}`;
export const dec = (v: number | null, d = 1) =>
  v === null ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
export const pct = (v: number | null, d = 1) =>
  v === null ? "—" : `${v > 0 ? "+" : ""}${(v * 100).toFixed(d).replace(".", ",")}%`;

export const dataCurta = (iso: string | null) =>
  iso
    ? new Date(iso + "T12:00:00Z").toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
      })
    : "—";

/* ---------- superfícies ---------- */

export function Panel({
  titulo,
  apoio,
  acao,
  children,
  className = "",
}: {
  titulo?: string;
  apoio?: ReactNode;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[22px] border border-line/70 bg-surface/55 p-5 backdrop-blur-sm sm:p-6 ${className}`}
    >
      {(titulo || acao) && (
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            {titulo && (
              <h3 className="font-display text-[1.45rem] leading-none font-normal text-cream">
                {titulo}
              </h3>
            )}
            {apoio && <p className="mt-2 text-[0.8rem] text-muted">{apoio}</p>}
          </div>
          {acao}
        </header>
      )}
      {children}
    </section>
  );
}

export function Delta({ v }: { v: number | null }) {
  if (v === null) return <span className="text-[0.8rem] text-muted">sem base</span>;
  const positivo = v >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.78rem] font-medium ${
        positivo ? "bg-gold/12 text-gold-soft" : "bg-wine/25 text-[#e58aa0]"
      }`}
    >
      <span aria-hidden>{positivo ? "▲" : "▼"}</span>
      {pct(v)}
    </span>
  );
}

/** Uma barra do mini-gráfico semanal dentro do Stat. */
export type BarraSemana = { curto: string; label: string; valor: number | null };

export function Stat({
  rotulo,
  valor,
  apoio,
  delta,
  semanas,
  fmt = int,
  cor = C.gold,
}: {
  rotulo: string;
  valor: string;
  apoio?: ReactNode;
  delta?: ReactNode;
  /** Quando presente, o cartão ganha as barras da semana; passar o mouse reescreve o número. */
  semanas?: BarraSemana[];
  fmt?: (v: number | null) => string;
  cor?: string;
}) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const s = ativo === null ? null : (semanas?.[ativo] ?? null);

  return (
    <div
      className="rounded-[22px] border border-line/70 bg-surface/55 p-5 backdrop-blur-sm"
      onMouseLeave={() => setAtivo(null)}
    >
      <p className="eyebrow">{rotulo}</p>
      <p className="fig mt-3 text-[2.6rem] leading-[0.95] text-cream">{s ? fmt(s.valor) : valor}</p>
      {(apoio || delta || s) && (
        <div className="mt-4 flex min-h-7 flex-wrap items-center gap-3 text-[0.8rem] text-muted">
          {s ? (
            <span className="text-cream/85">{s.label}</span>
          ) : (
            <>
              {delta}
              {apoio}
            </>
          )}
        </div>
      )}
      {semanas && semanas.length > 0 && (
        <Semanas dados={semanas} ativo={ativo} onAtivo={setAtivo} fmt={fmt} cor={cor} />
      )}
    </div>
  );
}

function Semanas({
  dados,
  ativo,
  onAtivo,
  fmt,
  cor,
}: {
  dados: BarraSemana[];
  ativo: number | null;
  onAtivo: (i: number | null) => void;
  fmt: (v: number | null) => string;
  cor: string;
}) {
  const max = Math.max(0, ...dados.map((d) => d.valor ?? 0));

  return (
    <div className="mt-5 flex items-end gap-1.5">
      {dados.map((d, i) => {
        const alto = max > 0 && d.valor !== null ? Math.max(3, (d.valor / max) * 44) : 2;
        const foco = ativo === i;
        const vizinho = ativo !== null && Math.abs(ativo - i) === 1;
        return (
          <button
            key={d.curto}
            type="button"
            className="flex flex-1 cursor-default flex-col items-center gap-2"
            onMouseEnter={() => onAtivo(i)}
            onFocus={() => onAtivo(i)}
            onBlur={() => onAtivo(null)}
            aria-label={`${d.label}: ${fmt(d.valor)}`}
          >
            <span className="flex h-11 w-full items-end" aria-hidden>
              <span
                className="w-full origin-bottom rounded-full transition-[opacity,transform] duration-300 ease-out"
                style={{
                  height: alto,
                  background: cor,
                  opacity: foco ? 1 : vizinho ? 0.5 : ativo !== null ? 0.18 : 0.34,
                  transform: foco ? "scaleX(1.14)" : "scaleX(1)",
                }}
              />
            </span>
            <span
              className={`text-[0.62rem] tracking-[0.12em] uppercase transition-colors duration-300 ${
                foco ? "text-cream" : "text-muted/70"
              }`}
              aria-hidden
            >
              {d.curto}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- eixos e tooltip ---------- */

export const eixo = {
  stroke: C.line,
  tick: { fill: C.muted, fontSize: 12 },
  tickLine: false,
  axisLine: { stroke: C.line },
};

export const gridProps = {
  stroke: C.grid,
  vertical: false,
};

type TipItem = { name?: string; value?: number | null; color?: string; dataKey?: string | number };

export function Tip({
  active,
  payload,
  label,
  fmt = (v: number) => int(v),
  titulo,
  nota,
}: {
  active?: boolean;
  payload?: TipItem[];
  label?: string | number;
  fmt?: (v: number) => string;
  titulo?: (label: string | number) => string;
  nota?: (label: string | number) => string | null;
}) {
  if (!active || !payload?.length) return null;
  const itens = payload.filter((p) => p.value !== null && p.value !== undefined);
  if (!itens.length) return null;
  const texto = nota?.(label ?? "") ?? null;
  return (
    <div className="rounded-2xl border border-line bg-ink-2/95 px-4 py-3 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)] backdrop-blur">
      <p className="eyebrow mb-2">{titulo ? titulo(label ?? "") : label}</p>
      <ul className="space-y-1.5">
        {itens.map((p, i) => (
          <li key={i} className="flex items-center gap-3 text-[0.85rem]">
            <span
              className="size-2 rounded-full"
              style={{ background: p.color }}
              aria-hidden
            />
            <span className="text-muted">{p.name}</span>
            <span className="num ml-auto text-cream">{fmt(p.value as number)}</span>
          </li>
        ))}
      </ul>
      {texto && (
        <p className="mt-3 max-w-[16rem] border-t border-line/70 pt-2.5 text-[0.8rem] leading-snug text-gold-soft">
          {texto}
        </p>
      )}
    </div>
  );
}

/* ---------- observações ---------- */

/** Nota presa a uma categoria do eixo x: "S1", o dia "12", a data "2026-05-12". */
export type Nota = { chave: string; texto: string };

const OBS = "fazendinha:observacoes";

/**
 * Observações escritas no painel, por escopo (seção + mês ou evento).
 * ponytail: ficam no localStorage deste navegador; mover para um backend se a equipe precisar compartilhar.
 */
export function useObservacoes(escopo: string) {
  const [todas, setTodas] = useState<Record<string, Nota[]>>(() =>
    JSON.parse(localStorage.getItem(OBS) || "{}")
  );
  const itens = todas[escopo] ?? [];
  const salvar = (lista: Nota[]) => {
    const novo = { ...todas, [escopo]: lista };
    localStorage.setItem(OBS, JSON.stringify(novo));
    setTodas(novo);
  };
  return {
    itens,
    adicionar: (n: Nota) => salvar([...itens, n]),
    remover: (i: number) => salvar(itens.filter((_, j) => j !== i)),
  };
}
export type Observacoes = ReturnType<typeof useObservacoes>;

/**
 * Envolve um gráfico cujo clique anota. O mousedown não pode focar o svg: no foco
 * o Recharts liga a navegação por teclado no primeiro item e o `activeLabel` do
 * clique passa a ser sempre ele. Tab + setas continuam funcionando.
 */
export function Clicavel({ children }: { children: ReactNode }) {
  return (
    <div className="cursor-pointer" onMouseDown={(e) => e.preventDefault()}>
      {children}
    </div>
  );
}

/** Textos de uma categoria do eixo, para o tooltip. */
export const notaDe = (notas: Nota[], chave: string | number) =>
  notas
    .filter((n) => n.chave === String(chave))
    .map((n) => n.texto)
    .join(" · ") || null;

/**
 * Lista de observações (planilha + painel) com o campo para anotar. `alvo` é a
 * categoria do select; clicar numa barra ou ponto do gráfico o preenche e foca `id`.
 */
export function Notas({
  id,
  planilha,
  obs,
  opcoes,
  alvo,
  onAlvo,
}: {
  id: string;
  planilha: Nota[];
  obs: Observacoes;
  opcoes: { chave: string; nome: string }[];
  alvo: string;
  onAlvo: (chave: string) => void;
}) {
  const nome = (chave: string) => opcoes.find((o) => o.chave === chave)?.nome ?? chave;
  const ordem = (chave: string) => {
    const i = opcoes.findIndex((o) => o.chave === chave);
    return i < 0 ? opcoes.length : i;
  };
  const itens = [
    ...planilha.map((n) => ({ ...n, i: -1 })),
    ...obs.itens.map((n, i) => ({ ...n, i })),
  ].sort((a, b) => ordem(a.chave) - ordem(b.chave));
  const valor = opcoes.some((o) => o.chave === alvo) ? alvo : (opcoes[0]?.chave ?? "");

  return (
    <div className="mt-5 border-t border-line/50 pt-4">
      <p className="eyebrow">Observações</p>
      {itens.length > 0 && (
        <ul className="mt-3 space-y-2">
          {itens.map((n) => (
            <li key={`${n.i}-${n.chave}-${n.texto}`} className="group flex items-start gap-3 text-[0.85rem]">
              <span className="w-24 shrink-0 text-gold-soft">{nome(n.chave)}</span>
              <span className="min-w-0 flex-1 break-words text-muted">{n.texto}</span>
              {n.i >= 0 && (
                <button
                  type="button"
                  onClick={() => obs.remover(n.i)}
                  aria-label={`Remover observação de ${nome(n.chave)}`}
                  className="text-muted/60 transition-colors hover:text-cream"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const campo = e.currentTarget.elements.namedItem("texto") as HTMLInputElement;
          const texto = campo.value.trim();
          if (!texto || !valor) return;
          obs.adicionar({ chave: valor, texto });
          campo.value = "";
        }}
      >
        <select
          value={valor}
          onChange={(e) => onAlvo(e.target.value)}
          aria-label="Onde anotar"
          className="rounded-full border border-line bg-ink-2/80 px-3 py-2 text-[0.8rem] text-cream"
        >
          {opcoes.map((o) => (
            <option key={o.chave} value={o.chave}>
              {o.nome}
            </option>
          ))}
        </select>
        <input
          id={id}
          name="texto"
          maxLength={200}
          placeholder="Feriado, chuva, campanha… (ou clique no gráfico)"
          aria-label="Texto da observação"
          className="min-w-0 flex-1 basis-56 rounded-full border border-line bg-ink-2/80 px-4 py-2 text-[0.85rem] text-cream placeholder:text-muted/60 focus:border-gold"
        />
        <button className="rounded-full border border-gold-dim/70 px-4 py-2 text-[0.8rem] text-gold-soft transition-colors hover:border-gold hover:bg-gold/10">
          Anotar
        </button>
      </form>
    </div>
  );
}

/* ---------- filtros ---------- */

/** Grupo de seleção múltipla. Nunca esvazia: o último item marcado não desmarca. */
export function Filtro<T extends string | number>({
  rotulo,
  opcoes,
  sel,
  onSel,
}: {
  rotulo: string;
  opcoes: { v: T; nome: string }[];
  sel: T[];
  onSel: (s: T[]) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3" role="group" aria-label={rotulo}>
      <span className="eyebrow">{rotulo}</span>
      <div className="flex flex-wrap gap-1 rounded-full border border-line/70 p-1">
        {opcoes.map((o) => {
          const ativo = sel.includes(o.v);
          return (
            <button
              key={o.v}
              type="button"
              aria-pressed={ativo}
              onClick={() =>
                onSel(
                  ativo
                    ? sel.length > 1
                      ? sel.filter((s) => s !== o.v)
                      : sel
                    : opcoes.map((x) => x.v).filter((v) => v === o.v || sel.includes(v))
                )
              }
              className={`rounded-full px-3.5 py-1.5 text-[0.78rem] transition-colors ${
                ativo ? "bg-gold text-ink" : "text-muted hover:text-cream"
              }`}
            >
              {o.nome}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** A linha de filtros: acima dos gráficos que ela recorta, nunca dentro de um cartão. */
export function Filtros({ children, nota }: { children: ReactNode; nota?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-2">
      {children}
      {nota && <span className="text-[0.78rem] text-muted">{nota}</span>}
    </div>
  );
}

/** Tick do eixo que destaca os dias com observação. */
export function TickDia(props: {
  x?: number;
  y?: number;
  payload?: { value: number };
  marcados?: Set<number>;
}) {
  const { x = 0, y = 0, payload, marcados } = props;
  const dia = payload?.value;
  const marcado = dia !== undefined && !!marcados?.has(dia);
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={13}
        textAnchor="middle"
        fontSize={12}
        fill={marcado ? C.goldSoft : C.muted}
      >
        {dia}
      </text>
      {marcado && <circle cx={0} cy={21} r={2} fill={C.goldSoft} />}
    </g>
  );
}

export function Legenda({ itens }: { itens: { nome: string; cor: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {itens.map((i) => (
        <li key={i.nome} className="flex items-center gap-2 text-[0.8rem] text-muted">
          <span className="size-2.5 rounded-full" style={{ background: i.cor }} aria-hidden />
          {i.nome}
        </li>
      ))}
    </ul>
  );
}

/* ---------- anel de meta: o círculo do logo como medida ---------- */

export function Anel({
  valor,
  meta,
  rotulo,
  cor,
  tamanho = 168,
  fmt = (v: number | null) => dec(v, 1),
  apoio,
}: {
  valor: number | null;
  meta: number;
  rotulo: string;
  cor: string;
  tamanho?: number;
  fmt?: (v: number | null) => string;
  apoio?: ReactNode;
}) {
  const r = tamanho / 2 - 12;
  const circ = 2 * Math.PI * r;
  const frac = valor === null || meta <= 0 ? 0 : Math.min(valor / meta, 1);
  return (
    <figure className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: tamanho, height: tamanho }}>
        <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} aria-hidden>
          <circle
            cx={tamanho / 2}
            cy={tamanho / 2}
            r={r}
            fill="none"
            stroke={C.grid}
            strokeWidth={7}
          />
          <circle
            cx={tamanho / 2}
            cy={tamanho / 2}
            r={r}
            fill="none"
            stroke={cor}
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - frac)}
            transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}
            style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.2,.7,.2,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="fig text-[2.3rem] leading-none text-cream">{fmt(valor)}</span>
          <span className="mt-1 text-[0.72rem] tracking-[0.18em] text-muted uppercase">
            de {int(meta)}
          </span>
        </div>
      </div>
      <figcaption className="text-center">
        <p className="font-display text-[1.15rem] text-cream">{rotulo}</p>
        <p className="text-[0.8rem] text-muted">
          {apoio ?? (valor === null ? "sem dados" : `${((valor / meta) * 100).toFixed(0)}% da meta`)}
        </p>
      </figcaption>
    </figure>
  );
}
