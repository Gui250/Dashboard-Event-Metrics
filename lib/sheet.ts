import * as XLSX from "xlsx";

export type Cell = string | number | boolean | null;
export type Grid = Cell[][];

/** Normaliza rótulos: sem acento, sem espaço extra, maiúsculo. */
export function norm(v: Cell): string {
  if (v === null || v === undefined) return "";
  return String(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/** Número tolerante a texto pt-BR ("1.234,56"), % e erros do Excel ("#DIV/0!"). */
export function num(v: Cell): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s || s.startsWith("#")) return null;
  const cleaned = s
    .replace(/[R$\s%]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function toGrid(ws: XLSX.WorkSheet): Grid {
  return XLSX.utils.sheet_to_json<Cell[]>(ws, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
  });
}

/** Primeira célula cujo rótulo normalizado bate com `label`. */
export function findCell(grid: Grid, label: string): { r: number; c: number } | null {
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      if (norm(row[c]) === label) return { r, c };
    }
  }
  return null;
}

/** Serial do Excel -> ISO (yyyy-mm-dd). Base 1899-12-30, como o padrão do Excel. */
export function excelDate(v: Cell): string | null {
  const n = num(v);
  if (n === null || n < 1 || n > 60000) return null;
  const ms = Date.UTC(1899, 11, 30) + Math.round(n) * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function readWorkbook(buf: ArrayBuffer): XLSX.WorkBook {
  return XLSX.read(buf, { type: "array", cellDates: false });
}

export class PlanilhaInvalida extends Error {}
