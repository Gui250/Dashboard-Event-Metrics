/**
 * Verificação dos parsers contra as planilhas reais + os templates gerados.
 * Rode com: npm run check
 */
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parseVendas, templateVendas, variacao } from "../lib/vendas.ts";
import { parseClientes, templateClientes } from "../lib/clientes.ts";
import { parseEvento, resumo, templateEvento } from "../lib/evento.ts";

const buf = (p: string) => {
  const b = readFileSync(p);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const wbBuf = (wb: XLSX.WorkBook) =>
  new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" })).buffer as ArrayBuffer;

const home = process.env.HOME;

// --- Vendas, planilha real -------------------------------------------------
const v = parseVendas(buf(`${home}/Downloads/CONVERSÃO DE VENDAS 20252.xlsx`));
assert.equal(v.mes.toUpperCase(), "SETEMBRO");
assert.equal(v.periodos.length, 4); // SEMANA 5 está vazia e é descartada
assert.equal(v.periodos[0].label, "Semana 1");
assert.equal(v.periodos[0].clientes[2024], 626);
assert.equal(v.periodos[0].clientes[2026], 567);
assert.equal(Math.round(v.periodos[0].faturamento[2025]!), 308905);
assert.equal(v.periodos[0].intervalos[2024]?.de, "2024-09-02");
assert.ok(v.periodos.every((p) => p.clientes[2024] !== null));
assert.ok(v.fechamento);
assert.equal(v.fechamento!.clientes[2024], 2803);
assert.equal(Math.round(v.fechamento!.ticket[2024]!), 464);
assert.equal(variacao(v.fechamento!.clientes, 2024, 2025)!.toFixed(4), "-0.0392");
assert.equal(variacao(v.fechamento!.clientes, 2025, 2026)!.toFixed(4), "-0.7895");
console.log("vendas ok:", v.mes, v.periodos.map((p) => p.label).join(", "));

// --- Vendas, template vazio ------------------------------------------------
assert.throws(() => parseVendas(wbBuf(templateVendas())), /Nenhuma aba/);

// --- Clientes, planilha real ----------------------------------------------
const c = parseClientes(buf(`${home}/Downloads/CONVERSÃO CLIENTES.xlsx`));
assert.equal(c.meses.length, 5);
assert.equal(c.meses[0].nome, "MAIO 2026");
assert.equal(c.meta, 100);
assert.equal(c.meses[0].media.tarde!.toFixed(2), "75.14");
assert.equal(c.meses[0].media.noite!.toFixed(2), "60.10");
assert.equal(c.mediaGeral.tarde!.toFixed(2), "66.39"); // bate com MÉDIA GERAL da planilha
assert.equal(c.mediaGeral.noite!.toFixed(2), "58.26");
// dias com clube só à tarde ou só à noite continuam alinhados pelo dia do mês
const dia2 = c.meses[0].dias.find((d) => d.dia === 2)!;
assert.equal(dia2.tarde, 34);
assert.equal(dia2.noite, null);
console.log("clientes ok:", c.meses.map((m) => m.nome).join(", "));

// --- Clientes, template vazio ---------------------------------------------
assert.throws(() => parseClientes(wbBuf(templateClientes(2026))), /Nenhuma aba/);

// --- Round-trip: template preenchido é lido de volta -----------------------
const t = templateClientes(2026);
const ws = t.Sheets["MAIO 2026"];
XLSX.utils.sheet_add_aoa(ws, [[1, 80, 1, 60]], { origin: "B4" });
XLSX.utils.sheet_add_aoa(ws, [[2, 120, 2, 40]], { origin: "B5" });
const lido = parseClientes(wbBuf(t));
assert.equal(lido.meses.length, 1);
assert.equal(lido.meses[0].media.tarde, 100);
assert.equal(lido.meses[0].media.noite, 50);
console.log("template round-trip ok");

// --- Evento, planilha real -------------------------------------------------
const e = parseEvento(buf(`${home}/Downloads/GESTÃO DE VENDAS 50 ANOS FAZENDINHA.xlsx`));
assert.equal(e.atracao, "SÉRGIO REIS");
assert.equal(e.dataEvento, "2026-09-24");
assert.equal(e.meta.publico, 400);
assert.equal(e.lotes.length, 3);
assert.equal(e.lotes[0].label, "1º LOTE");
assert.equal(e.lotes[0].preco, 600);
assert.equal(e.lotes[1].preco, 700);
// A janela do 3º lote vai até 20/09, mas a planilha só está preenchida até 10/09.
assert.equal(e.lotes[2].inicio, "2026-08-29");
assert.equal(e.lotes[2].fim, "2026-09-20");
assert.equal(e.lotes[2].dias.at(-1)!.data, "2026-09-10");

const re = resumo(e);
assert.equal(re.pax, 46); // bate com PÚBLICO PAGANTE realizado
assert.equal(re.faturamento, 28200); // bate com TOTAL CONSOLIDADO
assert.equal(re.ticket!.toFixed(2), "613.04");
assert.equal(re.investimento, 319177);
assert.equal(re.payback, -290977);
assert.deepEqual(re.canais, { tarde: 23, noite: 7, sympla: 11, whatsapp: 5 });
assert.equal(re.porLote.map((l) => l.pax).join("/"), "22/6/18");
assert.equal(re.ultimoDia, "2026-09-10");
console.log("evento ok:", e.evento, "·", re.pax, "de", e.meta.publico);

// --- Evento, template vazio e round-trip ----------------------------------
// O template já traz a janela dos lotes: lê sem erro, ainda sem nenhuma venda.
const vazio = parseEvento(wbBuf(templateEvento(2026)));
assert.equal(vazio.lotes.length, 3);
assert.equal(resumo(vazio).pax, 0);
assert.equal(resumo(vazio).ticket, null);

const te = templateEvento(2026);
XLSX.utils.sheet_add_aoa(te.Sheets["ACOMPANHAMENTO"], [[2, 1, 0, 3]], { origin: "B5" });
XLSX.utils.sheet_add_aoa(te.Sheets["ROI"], [[7000]], { origin: "B15" });
const lidoE = parseEvento(wbBuf(te));
const rt = resumo(lidoE);
assert.equal(rt.pax, 6);
assert.equal(rt.faturamento, 3600); // 6 pax x R$ 600 do 1º lote
assert.equal(rt.investimento, 7000);
console.log("template evento round-trip ok");

console.log("\ntodos os checks passaram");
