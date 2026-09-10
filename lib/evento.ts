import * as XLSX from "xlsx";
import {
  type Cell,
  type Grid,
  PlanilhaInvalida,
  excelDate,
  findCell,
  norm,
  num,
  readWorkbook,
  toGrid,
} from "./sheet.ts";

export const CANAIS = ["tarde", "noite", "sympla", "whatsapp"] as const;
export type Canal = (typeof CANAIS)[number];

export const NOME_CANAL: Record<Canal, string> = {
  tarde: "Clube da tarde",
  noite: "Clube da noite",
  sympla: "Sympla",
  whatsapp: "WhatsApp",
};

/** Canais de balcão (clubes) versus canais de fora da casa. */
export const INTERNOS: Canal[] = ["tarde", "noite"];

export type DiaVenda = { data: string } & Record<Canal, number>;

export type Lote = {
  label: string;
  /** Preço do ingresso no lote — é ele que converte pax em faturamento. */
  preco: number | null;
  /** Primeiro e último dia da janela do lote, mesmo sem venda registrada. */
  inicio: string | null;
  fim: string | null;
  dias: DiaVenda[];
};

export type Despesa = { rotulo: string; valor: number };

export type EventoData = {
  evento: string;
  atracao: string | null;
  dataEvento: string | null;
  meta: { publico: number; ticket: number | null };
  lotes: Lote[];
  despesas: Despesa[];
};

const DESPESAS = [
  "CAMPANHA DE MARKETING",
  "DESPESAS COM ARTISTA",
  "OUTRAS DESPESAS GERAIS",
] as const;

/** Valor da célula à direita do rótulo — os blocos da ficha são todos rótulo/valor. */
function aoLado(grid: Grid, rotulo: string): Cell {
  const at = findCell(grid, rotulo);
  if (!at) return null;
  return grid[at.r]?.[at.c + 1] ?? null;
}

function texto(v: Cell): string | null {
  const s = v === null || v === undefined ? "" : String(v).trim();
  return s || null;
}

/**
 * Bloco de ficha/balanço (aba ROI). Só as metas e as despesas são lidas:
 * público realizado, ticket e faturamento saem do acompanhamento diário.
 */
function leFicha(grid: Grid): Omit<EventoData, "lotes"> | null {
  if (!findCell(grid, "DATA DO EVENTO")) return null;

  const despesas: Despesa[] = [];
  for (const rotulo of DESPESAS) {
    const v = num(aoLado(grid, rotulo));
    if (v !== null) despesas.push({ rotulo: texto(rotulo) ?? rotulo, valor: v });
  }

  return {
    evento: texto(aoLado(grid, "EVENTO")) ?? "Evento",
    atracao: texto(aoLado(grid, "ATRACAO PRINCIPAL")),
    dataEvento: excelDate(aoLado(grid, "DATA DO EVENTO")),
    meta: {
      publico: num(aoLado(grid, "PUBLICO PAGANTE")) ?? 0,
      ticket: num(aoLado(grid, "META TICKET MEDIO")),
    },
    despesas,
  };
}

/**
 * Blocos de lote (aba ACOMPANHAMENTO). A âncora é a linha de canais —
 * TARDE / NOITE / SYMPLA / WHATSAPP lado a lado. A data fica na coluna
 * anterior; o rótulo e o preço do lote, algumas linhas acima.
 */
function leLotes(grid: Grid): Lote[] {
  const lotes: Lote[] = [];

  for (let r = 0; r < grid.length; r++) {
    const row = grid[r] ?? [];
    for (let c = 1; c < row.length; c++) {
      const bate = CANAIS.every((canal, i) => norm(row[c + i]) === norm(canal));
      if (!bate) continue;

      const cData = c - 1;
      let cab: Cell[] = [];
      for (let k = r - 1; k >= 0 && r - k <= 3; k--) {
        const v = grid[k]?.[cData];
        if (texto(v) && norm(v) !== "DATA") {
          cab = grid[k] ?? [];
          break;
        }
      }

      const dias: DiaVenda[] = [];
      let inicio: string | null = null;
      let fim: string | null = null;

      for (let k = r + 1; k < grid.length; k++) {
        const linha = grid[k] ?? [];
        if (norm(linha[cData]).startsWith("TOTAL")) break;
        const data = excelDate(linha[cData] ?? null);
        if (!data) continue;
        inicio = inicio ?? data;
        fim = data;
        const vals = CANAIS.map((_, i) => num(linha[c + i] ?? null));
        // Dia ainda em branco: entra na janela do lote, mas não na venda.
        if (vals.every((v) => v === null)) continue;
        dias.push({
          data,
          tarde: vals[0] ?? 0,
          noite: vals[1] ?? 0,
          sympla: vals[2] ?? 0,
          whatsapp: vals[3] ?? 0,
        });
      }

      if (!inicio) continue;
      lotes.push({
        label: texto(cab[cData]) ?? `Lote ${lotes.length + 1}`,
        preco: num(cab[cData + 6] ?? null),
        inicio,
        fim,
        dias,
      });
    }
  }

  return lotes.sort((a, b) => (a.inicio ?? "").localeCompare(b.inicio ?? ""));
}

export function parseEvento(buf: ArrayBuffer): EventoData {
  const wb = readWorkbook(buf);
  let ficha: Omit<EventoData, "lotes"> | null = null;
  let lotes: Lote[] = [];

  for (const nome of wb.SheetNames) {
    const grid = toGrid(wb.Sheets[nome]);
    ficha = ficha ?? leFicha(grid);
    if (!lotes.length) lotes = leLotes(grid);
  }

  if (!ficha) {
    throw new PlanilhaInvalida(
      "Não achei a ficha técnica do evento (a célula DATA DO EVENTO). Baixe o template e use a mesma estrutura."
    );
  }
  if (!lotes.length) {
    throw new PlanilhaInvalida(
      "Não achei nenhum lote com as colunas TARDE, NOITE, SYMPLA e WHATSAPP. Baixe o template e use a mesma estrutura."
    );
  }

  return { ...ficha, lotes };
}

/* ---------- derivados: recalculados, nunca lidos ---------- */

export type Resumo = {
  pax: number;
  faturamento: number;
  ticket: number | null;
  metaFaturamento: number;
  canais: Record<Canal, number>;
  /** Pax por canal em cada lote, na ordem dos lotes. */
  porLote: { label: string; preco: number | null; pax: number; canais: Record<Canal, number> }[];
  investimento: number;
  payback: number;
  inicio: string | null;
  fim: string | null;
  /** Último dia com venda registrada — depois dele a planilha ainda está em branco. */
  ultimoDia: string | null;
};

const zeros = () => ({ tarde: 0, noite: 0, sympla: 0, whatsapp: 0 }) as Record<Canal, number>;

export function resumo(d: EventoData): Resumo {
  const canais = zeros();
  let pax = 0;
  let faturamento = 0;
  let ultimoDia: string | null = null;

  const porLote = d.lotes.map((lote) => {
    const doLote = zeros();
    let paxLote = 0;
    for (const dia of lote.dias) {
      for (const canal of CANAIS) {
        doLote[canal] += dia[canal];
        canais[canal] += dia[canal];
        paxLote += dia[canal];
      }
      if (!ultimoDia || dia.data > ultimoDia) ultimoDia = dia.data;
    }
    pax += paxLote;
    // Faturamento sai de pax × preço do lote: a planilha traz a conta pronta,
    // mas ela quebra quando o preço muda depois de lançada a venda.
    faturamento += paxLote * (lote.preco ?? d.meta.ticket ?? 0);
    return { label: lote.label, preco: lote.preco, pax: paxLote, canais: doLote };
  });

  const investimento = d.despesas.reduce((a, b) => a + b.valor, 0);
  const datas = d.lotes.flatMap((l) => [l.inicio, l.fim]).filter((v): v is string => !!v).sort();

  return {
    pax,
    faturamento,
    ticket: pax > 0 ? faturamento / pax : null,
    metaFaturamento: d.meta.publico * (d.meta.ticket ?? 0),
    canais,
    porLote,
    investimento,
    payback: faturamento - investimento,
    inicio: datas[0] ?? null,
    fim: datas[datas.length - 1] ?? null,
    ultimoDia,
  };
}

/* ---------- template ---------- */

const LOTES_TEMPLATE = [
  { label: "1º LOTE", preco: 600 },
  { label: "2º LOTE", preco: 700 },
  { label: "3º LOTE", preco: 600 },
];

/** Serial do Excel a partir de um ISO — o inverso de excelDate. */
const serial = (iso: string) =>
  Math.round((Date.parse(iso + "T00:00:00Z") - Date.UTC(1899, 11, 30)) / 86400000);

export function templateEvento(ano = new Date().getFullYear()): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  const roi: Cell[][] = [
    ["ROI - EVENTO"],
    [],
    ["FICHA TÉCNICA"],
    ["EVENTO", "NOME DO EVENTO"],
    ["ATRAÇÃO PRINCIPAL", null],
    ["DATA DO EVENTO", null],
    ["META TICKET MÉDIO", null],
    [],
    ["BALANÇO"],
    ["REFERENCIA", "META"],
    ["PÚBLICO PAGANTE", 400],
    [],
    ["DESPESAS"],
    ["AÇÕES", "VALOR"],
    ["CAMPANHA DE MARKETING", null],
    ["DESPESAS COM ARTISTA", null],
    ["OUTRAS DESPESAS GERAIS", null],
    [],
    ["Preencha só a meta e as despesas. Público, faturamento e ticket saem do acompanhamento."],
  ];
  const wsRoi = XLSX.utils.aoa_to_sheet(roi);
  wsRoi["!cols"] = [{ wch: 26 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsRoi, "ROI");

  // Um bloco por lote, lado a lado, com 8 colunas de distância — o mesmo
  // desenho da planilha original, que o parser encontra pela linha de canais.
  const largura = 8;
  const acomp: Cell[][] = [["QUADRO ANALÍTICO DAS VENDAS"], [], [], []];
  LOTES_TEMPLATE.forEach((lote, i) => {
    const c = i * largura;
    acomp[1][c] = lote.label;
    acomp[1][c + 6] = lote.preco;
    acomp[2][c] = "DATA";
    acomp[2][c + 1] = "CLUBES (INTERNO)";
    acomp[2][c + 3] = "DIGITAL";
    acomp[3][c] = null;
    CANAIS.forEach((canal, k) => {
      acomp[3][c + 1 + k] = canal.toUpperCase();
    });
    for (let d = 0; d < 10; d++) {
      acomp[4 + d] = acomp[4 + d] ?? [];
      acomp[4 + d][c] = serial(`${ano}-01-01`) + i * 10 + d;
    }
    acomp[14] = acomp[14] ?? [];
    acomp[14][c] = `TOTAL ${lote.label}`;
  });
  acomp.push([]);
  acomp.push(["Coluna DATA: o dia. As quatro colunas seguintes: pax vendidos em cada canal."]);

  const wsAcomp = XLSX.utils.aoa_to_sheet(acomp);
  wsAcomp["!cols"] = Array.from({ length: largura * 3 }, () => ({ wch: 12 }));
  XLSX.utils.book_append_sheet(wb, wsAcomp, "ACOMPANHAMENTO");

  return wb;
}
