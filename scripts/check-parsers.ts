/**
 * Verificação dos parsers contra as planilhas reais + os templates gerados.
 * Rode com: npm run check
 */
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parseVendas, templateVendas, variacao } from "../lib/vendas.ts";
import { diaDaSemana, filtrarDias, parseClientes, templateClientes } from "../lib/clientes.ts";
import { filtrarEvento, parseEvento, resumo, templateEvento } from "../lib/evento.ts";
import { assinar, verificar } from "../lib/sessao.ts";

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
XLSX.utils.sheet_add_aoa(ws, [[2, "Feriado municipal"]], { origin: "G4" });
const lido = parseClientes(wbBuf(t));
assert.equal(lido.meses.length, 1);
assert.equal(lido.meses[0].media.tarde, 100);
assert.equal(lido.meses[0].media.noite, 50);
assert.deepEqual(lido.meses[0].observacoes, [{ dia: 2, texto: "Feriado municipal" }]);
console.log("template round-trip ok");

// --- Observação de vendas, ida e volta -------------------------------------
const tv = templateVendas();
const wsv = tv.Sheets["SEMANA 1"];
XLSX.utils.sheet_add_aoa(wsv, [["TOTAL CLIENTES", 10, 20, null, 30]], { origin: "E8" });
XLSX.utils.sheet_add_aoa(wsv, [["FATURAMENTO", 100, 200, null, 300]], { origin: "E9" });
XLSX.utils.sheet_add_aoa(wsv, [["OBSERVAÇÃO", "Carnaval"]], { origin: "E12" });
const lidoV = parseVendas(wbBuf(tv));
assert.equal(lidoV.periodos[0].observacao, "Carnaval");
assert.equal(lidoV.periodos[0].ticket[2026], 10);
// planilhas sem o bloco continuam válidas
assert.equal(v.periodos[0].observacao, null);
assert.deepEqual(c.meses[0].observacoes, []);
// a ficha do evento aceita a mesma nota
const fichaComNota = templateEvento(2026);
XLSX.utils.sheet_add_aoa(fichaComNota.Sheets["ROI"], [["Véspera de feriado"]], { origin: "B8" });
assert.equal(parseEvento(wbBuf(fichaComNota)).observacoes, "Véspera de feriado");
console.log("observações ok");

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
XLSX.utils.sheet_add_aoa(te.Sheets["ROI"], [[7000]], { origin: "B16" });
const lidoE = parseEvento(wbBuf(te));
const rt = resumo(lidoE);
assert.equal(rt.pax, 6);
assert.equal(rt.faturamento, 3600); // 6 pax x R$ 600 do 1º lote
assert.equal(rt.investimento, 7000);
console.log("template evento round-trip ok");

// --- Filtros ---------------------------------------------------------------
assert.equal(diaDaSemana("MAIO 2026", 1), 5); // 1º de maio de 2026 é sexta
assert.equal(diaDaSemana("MARÇO 2026", 1), 0);
assert.equal(diaDaSemana("PLANILHA", 1), null);
// semana inteira não muda nada; fim de semana recalcula a média só com sáb/dom
assert.deepEqual(filtrarDias(c, [0, 1, 2, 3, 4, 5, 6]).mediaGeral, c.mediaGeral);
const fds = filtrarDias(c, [0, 6]);
assert.ok(fds.meses[0].dias.every((d) => [0, 6].includes(diaDaSemana("MAIO 2026", d.dia)!)));
const tardeFds = fds.meses[0].dias.map((d) => d.tarde).filter((x): x is number => x !== null);
assert.equal(fds.meses[0].media.tarde, tardeFds.reduce((a, b) => a + b, 0) / tardeFds.length);
assert.equal(fds.meses.length, c.meses.length);
// evento: canais fora do filtro zeram, lotes fora saem
const soSympla = resumo(filtrarEvento(e, e.lotes.map((l) => l.label), ["sympla"]));
assert.deepEqual(soSympla.canais, { tarde: 0, noite: 0, sympla: 11, whatsapp: 0 });
assert.equal(resumo(filtrarEvento(e, ["1º LOTE"], ["tarde", "noite", "sympla", "whatsapp"])).pax, 22);
assert.equal(resumo(e).pax, 46); // o original fica intacto
console.log("filtros ok");

// --- Sessão ----------------------------------------------------------------
const segredo = "x".repeat(32);
const token = assinar("ana", segredo);
assert.equal(verificar(token, segredo), "ana");
assert.equal(verificar(token, "y".repeat(32)), null); // outro segredo
assert.equal(verificar(token.replace(/.$/, (ch) => (ch === "A" ? "B" : "A")), segredo), null); // assinatura adulterada
assert.equal(verificar(assinar("ana", segredo, 0), segredo), null); // vencido
assert.equal(verificar(undefined, segredo), null);
assert.equal(verificar(token, undefined), null);
console.log("sessão ok");

console.log("\ntodos os checks passaram");
