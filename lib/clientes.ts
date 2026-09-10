import * as XLSX from "xlsx";
import {
  type Cell,
  type Grid,
  PlanilhaInvalida,
  norm,
  num,
  readWorkbook,
  toGrid,
} from "./sheet.ts";

export const CLUBES = ["tarde", "noite"] as const;
export type Clube = (typeof CLUBES)[number];

export type Dia = { dia: number; tarde: number | null; noite: number | null };

export type Mes = {
  nome: string;
  meta: Record<Clube, number>;
  dias: Dia[];
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

  const valores = (clube: Clube) =>
    dias.map((d) => d[clube]).filter((v): v is number => v !== null);

  return {
    nome: nome.trim(),
    meta,
    dias,
    media: { tarde: media(valores("tarde")), noite: media(valores("noite")) },
    total: {
      tarde: valores("tarde").reduce((a, b) => a + b, 0),
      noite: valores("noite").reduce((a, b) => a + b, 0),
    },
  };
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

  const mediasDe = (clube: Clube) =>
    media(meses.map((m) => m.media[clube]).filter((v): v is number => v !== null));

  return {
    meses,
    meta: meses[0].meta.tarde,
    mediaGeral: { tarde: mediasDe("tarde"), noite: mediasDe("noite") },
  };
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
      ["REF.", "CLUBE DA TARDE", null, "CLUBE DA NOITE"],
      [null, "META CLIENTES", 100, "META CLIENTES", 100],
    ];
    for (let d = 1; d <= 31; d++) aoa.push([d, null, null, null, null]);
    aoa.push([null, "MÉDIA REALIZADA", null, "MÉDIA REALIZADA", null]);
    aoa.push([]);
    aoa.push([null, "Coluna B/D: dia do mês. Coluna C/E: clientes do dia. Deixe em branco os dias sem operação."]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 6 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, `${mes} ${ano}`);
  }
  return wb;
}
