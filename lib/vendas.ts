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

export const ANOS = [2024, 2025, 2026] as const;
export type Ano = (typeof ANOS)[number];

export type PorAno = Record<Ano, number | null>;

export type Periodo = {
  /** "Semana 1" … "Semana 5" ou "Fechamento" */
  label: string;
  fechamento: boolean;
  /** Intervalo coberto em cada ano, quando informado na planilha. */
  intervalos: Partial<Record<Ano, { de: string | null; ate: string | null }>>;
  clientes: PorAno;
  faturamento: PorAno;
  ticket: PorAno;
};

export type VendasData = {
  mes: string;
  periodos: Periodo[];
  fechamento: Periodo | null;
};

/**
 * Layout esperado (o mesmo da planilha original e do template):
 * a célula "REFERENCIA" ancora o bloco. A partir da coluna dela,
 * +1 = 2024, +2 = 2025, +4 = 2026. As colunas +3, +5 e +6 são variações
 * calculadas — o painel as recalcula, então são ignoradas na leitura.
 */
const OFFSET_ANO: Record<Ano, number> = { 2024: 1, 2025: 2, 2026: 4 };

const MESES = [
  "JANEIRO", "FEVEREIRO", "MARCO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
];

function achaMes(grid: Grid): string | null {
  for (const row of grid.slice(0, 6)) {
    for (const cell of row ?? []) {
      const n = norm(cell);
      const mes = MESES.find((m) => n === m || n.startsWith(m + " "));
      if (mes) return String(cell).trim();
    }
  }
  return null;
}

function linha(grid: Grid, r: number, c: number, rotulo: string): PorAno | null {
  for (let i = r + 1; i < Math.min(r + 8, grid.length); i++) {
    if (norm(grid[i]?.[c] ?? null) !== rotulo) continue;
    const row = grid[i] ?? [];
    return {
      2024: num(row[c + OFFSET_ANO[2024]] ?? null),
      2025: num(row[c + OFFSET_ANO[2025]] ?? null),
      2026: num(row[c + OFFSET_ANO[2026]] ?? null),
    };
  }
  return null;
}

function intervalos(grid: Grid, ancora: number, c: number) {
  const out: Periodo["intervalos"] = {};
  for (let i = Math.max(0, ancora - 6); i < ancora; i++) {
    const row = grid[i] ?? [];
    if (norm(row[c + 1] ?? null) !== "DE") continue;
    const datas = (grid[i + 1] ?? []) as Cell[];
    ANOS.forEach((ano, idx) => {
      const de = excelDate(datas[c + 1 + idx * 2] ?? null);
      const ate = excelDate(datas[c + 2 + idx * 2] ?? null);
      if (de || ate) out[ano] = { de, ate };
    });
    break;
  }
  return out;
}

const vazio = (p: PorAno | null) => !p || ANOS.every((a) => p[a] === null);

function lePeriodo(grid: Grid, nomeAba: string): Periodo | null {
  const ancora = findCell(grid, "REFERENCIA");
  if (!ancora) return null;
  const { r, c } = ancora;

  const clientes = linha(grid, r, c, "TOTAL CLIENTES");
  const faturamento = linha(grid, r, c, "FATURAMENTO");
  let ticket = linha(grid, r, c, "TICKET MEDIO");

  if (vazio(clientes) && vazio(faturamento)) return null;

  // Ticket médio é derivado: recalcula sempre que der, para não herdar #DIV/0!.
  const derivado = { 2024: null, 2025: null, 2026: null } as PorAno;
  for (const ano of ANOS) {
    const cl = clientes?.[ano] ?? null;
    const fat = faturamento?.[ano] ?? null;
    derivado[ano] = cl && fat !== null ? fat / cl : (ticket?.[ano] ?? null);
  }
  ticket = derivado;

  const nome = norm(nomeAba);
  const semana = nome.match(/SEMANA\s*(\d+)/);
  return {
    label: semana ? `Semana ${semana[1]}` : nomeAba.trim(),
    fechamento: nome.includes("FECHAMENTO"),
    intervalos: intervalos(grid, r, c),
    clientes: clientes ?? { 2024: null, 2025: null, 2026: null },
    faturamento: faturamento ?? { 2024: null, 2025: null, 2026: null },
    ticket,
  };
}

export function parseVendas(buf: ArrayBuffer): VendasData {
  const wb = readWorkbook(buf);
  const periodos: Periodo[] = [];
  let mes: string | null = null;

  for (const nome of wb.SheetNames) {
    const grid = toGrid(wb.Sheets[nome]);
    mes = mes ?? achaMes(grid);
    const p = lePeriodo(grid, nome);
    if (p) periodos.push(p);
  }

  if (!periodos.length) {
    throw new PlanilhaInvalida(
      "Nenhuma aba com o bloco REFERENCIA / TOTAL CLIENTES foi encontrada. Baixe o template e use a mesma estrutura."
    );
  }

  return {
    mes: mes ?? "Período",
    periodos: periodos.filter((p) => !p.fechamento),
    fechamento: periodos.find((p) => p.fechamento) ?? null,
  };
}

/** Variação relativa entre dois anos (null quando não dá para comparar). */
export function variacao(p: PorAno, de: Ano, para: Ano): number | null {
  const a = p[de];
  const b = p[para];
  if (a === null || b === null || a === 0) return null;
  return (b - a) / a;
}

const ABAS = ["SEMANA 1", "SEMANA 2", "SEMANA 3", "SEMANA 4", "SEMANA 5", "FECHAMENTO"];

export function templateVendas(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  for (const aba of ABAS) {
    const rotulo = aba === "FECHAMENTO" ? "FECHAMENTO" : aba;
    const aoa: Cell[][] = [
      [null, "MÊS", null, null, "ANÁLISE DE CRESCIMENTO 2024 / 2026"],
      [],
      [null, "MÊS", rotulo, null, "PERÍODOS", 2024, null, 2025, null, 2026],
      [null, null, null, null, null, "DE", "ATÉ", "DE", "ATÉ", "DE", "ATÉ"],
      [null, null, null, null, null, null, null, null, null, null, null],
      [],
      [null, null, null, null, "REFERENCIA", 2024, 2025, "2024/2025", 2026, "2025/2026", "2024/2026"],
      [null, null, null, null, "TOTAL CLIENTES"],
      [null, null, null, null, "FATURAMENTO"],
      [null, null, null, null, "TICKET MÉDIO"],
      [],
      [null, null, null, null, "Preencha 2024, 2025 e 2026. As variações são calculadas pelo painel."],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 4 }, { wch: 14 }, { wch: 14 }, { wch: 3 }, { wch: 18 },
      { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 13 }];
    XLSX.utils.book_append_sheet(wb, ws, aba);
  }
  return wb;
}
