import * as XLSX from "xlsx";
import {
  type Cell,
  type Grid,
  PlanilhaInvalida,
  findCell,
  norm,
  num,
  readWorkbook,
  toGrid,
} from "./sheet.ts";

export const CLUBES = ["tarde", "noite"] as const;
export type Clube = (typeof CLUBES)[number];

export type Dia = { dia: number; tarde: number | null; noite: number | null };

/** Feriado, evento ou qualquer nota presa a um dia do mês. */
export type Observacao = { dia: number; texto: string };

export type Mes = {
  nome: string;
  meta: Record<Clube, number>;
  dias: Dia[];
  observacoes: Observacao[];
  media: Record<Clube, number | null>;
  total: Record<Clube, number>;
};

export type ClientesData = {
  meses: Mes[];
  meta: number;
  mediaGeral: Record<Clube, number | null>;
};

const media = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

/** Média e total de cada clube, sempre recalculados dos dias. */
function doMes(dias: Dia[]): Pick<Mes, "media" | "total"> {
  const valores = (clube: Clube) =>
    dias.map((d) => d[clube]).filter((v): v is number => v !== null);
  return {
    media: { tarde: media(valores("tarde")), noite: media(valores("noite")) },
    total: {
      tarde: valores("tarde").reduce((a, b) => a + b, 0),
      noite: valores("noite").reduce((a, b) => a + b, 0),
    },
  };
}

/** Média das médias mensais — o mesmo critério da MÉDIA GERAL da planilha. */
const mediaGeralDe = (meses: Mes[]): Record<Clube, number | null> => {
  const de = (clube: Clube) =>
    media(meses.map((m) => m.media[clube]).filter((v): v is number => v !== null));
  return { tarde: de("tarde"), noite: de("noite") };
};

/**
 * Bloco "OBSERVAÇÕES": a célula-rótulo ancora duas colunas — dia e texto.
 * Fica fora das colunas de clube porque uma nota é do dia, não de um turno
 * (as colunas de tarde e noite podem estar em dias diferentes na mesma linha).
 */
function leObservacoes(grid: Grid): Observacao[] {
  const ancora = findCell(grid, "OBSERVACOES");
  if (!ancora) return [];
  const out: Observacao[] = [];
  for (let r = ancora.r + 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    const dia = num(row[ancora.c] ?? null);
    const texto = String(row[ancora.c + 1] ?? "").trim();
    if (dia === null || dia < 1 || dia > 31 || !texto) continue;
    out.push({ dia, texto });
  }
  return out.sort((a, b) => a.dia - b.dia);
}

function leMes(grid: Grid, nome: string): Mes | null {
  // A linha "META CLIENTES" ancora os dois blocos: cada ocorrência marca
  // a coluna do dia; a coluna seguinte traz a meta e, abaixo, os valores.
  let linhaMeta = -1;
  const colunas: number[] = [];
  for (let r = 0; r < grid.length && linhaMeta < 0; r++) {
    const row = grid[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      if (norm(row[c]) === "META CLIENTES") {
        linhaMeta = r;
        colunas.push(c);
      }
    }
  }
  if (linhaMeta < 0 || colunas.length < 2) return null;

  const metaRow = grid[linhaMeta] ?? [];
  const meta = {
    tarde: num(metaRow[colunas[0] + 1] ?? null) ?? 100,
    noite: num(metaRow[colunas[1] + 1] ?? null) ?? 100,
  };

  const porDia = new Map<number, Dia>();
  for (let r = linhaMeta + 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    if (norm(row[colunas[0]] ?? null).startsWith("MEDIA")) break;
    CLUBES.forEach((clube, i) => {
      const c = colunas[i];
      const dia = num(row[c] ?? null);
      const valor = num(row[c + 1] ?? null);
      if (dia === null || dia < 1 || dia > 31 || valor === null) return;
      const reg = porDia.get(dia) ?? { dia, tarde: null, noite: null };
      reg[clube] = valor;
      porDia.set(dia, reg);
    });
  }

  const dias = [...porDia.values()].sort((a, b) => a.dia - b.dia);
  if (!dias.length) return null;

  return { nome: nome.trim(), meta, dias, observacoes: leObservacoes(grid), ...doMes(dias) };
}

export function parseClientes(buf: ArrayBuffer): ClientesData {
  const wb = readWorkbook(buf);
  const meses: Mes[] = [];

  for (const nome of wb.SheetNames) {
    // ACUMULADO é derivado das abas mensais — o painel recalcula.
    if (norm(nome).includes("ACUMULADO")) continue;
    const m = leMes(toGrid(wb.Sheets[nome]), nome);
    if (m) meses.push(m);
  }

  if (!meses.length) {
    throw new PlanilhaInvalida(
      "Nenhuma aba mensal com META CLIENTES e dias preenchidos foi encontrada. Baixe o template e use a mesma estrutura."
    );
  }

  return { meses, meta: meses[0].meta.tarde, mediaGeral: mediaGeralDe(meses) };
}

/** Dia da semana (0 = domingo) pelo nome da aba, "MAIO 2026"; null se a aba não traz mês e ano. */
export function diaDaSemana(nomeMes: string, dia: number): number | null {
  const n = norm(nomeMes);
  const mes = MESES.findIndex((m) => n.startsWith(norm(m)));
  const ano = Number(n.match(/\d{4}/)?.[0]);
  if (mes < 0 || !ano) return null;
  return new Date(Date.UTC(ano, mes, dia)).getUTCDay();
}

/**
 * Recorte por dia da semana. Médias, totais e média geral saem de novo dos
 * dias que sobram; meses sem dia algum continuam na lista, vazios.
 */
export function filtrarDias(d: ClientesData, semana: number[]): ClientesData {
  const meses = d.meses.map((m) => {
    const dias = m.dias.filter((x) => {
      const w = diaDaSemana(m.nome, x.dia);
      return w === null || semana.includes(w);
    });
    return { ...m, dias, ...doMes(dias) };
  });
  return { ...d, meses, mediaGeral: mediaGeralDe(meses) };
}

const MESES = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
];

export function templateClientes(ano = new Date().getFullYear()): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  for (const mes of MESES) {
    const aoa: Cell[][] = [
      ["FLUXO DE CLIENTES POR CLUBES"],
      ["REF.", "CLUBE DA TARDE", null, "CLUBE DA NOITE", null, null, "OBSERVAÇÕES"],
      [null, "META CLIENTES", 100, "META CLIENTES", 100, null, "DIA", "OBSERVAÇÃO"],
    ];
    for (let d = 1; d <= 31; d++) aoa.push([d, null, null, null, null]);
    aoa.push([null, "MÉDIA REALIZADA", null, "MÉDIA REALIZADA", null]);
    aoa.push([]);
    aoa.push([null, "Coluna B/D: dia do mês. Coluna C/E: clientes do dia. Deixe em branco os dias sem operação."]);
    aoa.push([null, "Coluna G/H: dia e observação — feriados, eventos, o que explicar o movimento."]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 6 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 12 },
      { wch: 3 }, { wch: 6 }, { wch: 34 }];
    XLSX.utils.book_append_sheet(wb, ws, `${mes} ${ano}`);
  }
  return wb;
}
