# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Comandos

```bash
npm run dev      # Next 16 + Turbopack
npm run build
npm run lint     # eslint (flat config)
npm run check    # valida os parsers de planilha
```

`npm run check` roda `scripts/check-parsers.ts` com `node --experimental-strip-types` — sem
framework de teste. Ele lê as planilhas reais em `~/Downloads/CONVERSÃO DE VENDAS 20252.xlsx`,
`~/Downloads/CONVERSÃO CLIENTES.xlsx` e `~/Downloads/GESTÃO DE VENDAS 50 ANOS FAZENDINHA.xlsx`;
sem esses arquivos ele falha no `readFileSync`.
Um caso novo é um `assert` a mais nesse arquivo — não crie suíte separada.

## Arquitetura

Painel 100% client-side: sem API routes, sem backend, sem persistência. `app/page.tsx` é o
único dono de estado (`useState` por seção) e as planilhas são lidas no navegador via SheetJS.

**Leitura de planilha (`lib/`)** — `sheet.ts` traz os helpers tolerantes (`norm` sem acento,
`num` para texto pt-BR e erros `#DIV/0!`, `excelDate` para seriais). `vendas.ts`, `clientes.ts`
e `evento.ts` têm, cada um, o parser e o gerador de template da sua seção. Três invariantes
sustentam esse desenho:

1. **Parsing por âncora, não por coordenada.** Os parsers procuram uma célula-rótulo
   (`REFERENCIA` em vendas, `META CLIENTES` em clientes, a linha de canais
   `TARDE NOITE SYMPLA WHATSAPP` em evento) e leem deslocamentos relativos a
   ela. É o que faz a planilha original do cliente e o template gerado passarem pelo mesmo
   código. Ao mexer no template, o round-trip precisa continuar passando no `npm run check`.
2. **Colunas de ano vêm de `OFFSET_ANO`, nunca do cabeçalho.** Na planilha original a coluna
   de 2026 está rotulada como "2025" — o rótulo é typo do cliente e não pode ser usado.
3. **Todo valor derivado é recalculado, nunca lido.** Ticket médio, variações, médias
   mensais e a aba `ACUMULADO` (ignorada) saem dos dados brutos, porque as células de origem
   carregam `#DIV/0!` e comparações parciais. Em evento isso vale também para faturamento
   (pax × preço do lote), payback e o `resumo()` inteiro — a aba `ROI` só entra com a ficha,
   a meta e as despesas.

**Design system (`app/globals.css` + `components/ui.tsx`)** — as cores foram amostradas do
logo da marca e vivem no `@theme` do Tailwind v4. O objeto `C` em `components/ui.tsx` repete
os mesmos hex porque Recharts não lê CSS custom properties; os dois precisam andar juntos.
A gramática dos gráficos é: grandeza vira barra, taxa vira linha. O anel de meta (`Anel`) é
SVG à mão, não Recharts. `RAMPA_OURO` é a rampa ordinal única (anos, lotes) — o validador de
paleta reprova quatro matizes categóricas nesta marca sobre fundo escuro, então uma dimensão
com mais de duas categorias vira categoria de eixo, não cor.

**Convenções** — identificadores e UI em português. Imports dentro de `lib/` usam extensão
`.ts` explícita (`allowImportingTsExtensions`) para o script de check rodar sem bundler;
não remova as extensões.

**Dependência `xlsx`** — instalada do tarball da SheetJS (`cdn.sheetjs.com/xlsx-0.20.3`),
não do registro npm, cujo `xlsx` parou em 0.18.5. `npm i xlsx` faz downgrade — reinstale
sempre pela URL do CDN.
