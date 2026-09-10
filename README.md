# Painel de conversão — Fazendinha Resort Privé

Dashboard em Next.js + Recharts com duas seções:

- **Vendas clientes** — crescimento semanal de clientes, faturamento e ticket médio (2024 / 2025 / 2026), com fechamento do mês.
- **Conversão de clientes** — fluxo diário por clube (tarde e noite) frente à meta, média mensal e comparação entre os dois clubes.

Cada seção tem o próprio botão **Baixar template** (.xlsx) e aceita o upload da planilha
preenchida — os gráficos são gerados na hora, no navegador. Nenhum dado sai da máquina.

## Rodando

```bash
npm install
npm run dev      # http://localhost:3000
npm run check    # valida os leitores de planilha contra arquivos reais
npm run build    # produção
```

## Estrutura da planilha

**Vendas** — uma aba por semana (`SEMANA 1`…`SEMANA 5`) e uma de `FECHAMENTO`.
A célula `REFERENCIA` ancora o bloco; nas linhas abaixo dela vêm `TOTAL CLIENTES`,
`FATURAMENTO` e `TICKET MÉDIO`, com 2024, 2025 e 2026 nas colunas seguintes.
As variações são recalculadas pelo painel.

**Clientes** — uma aba por mês. A linha `META CLIENTES` marca as duas colunas de clube;
abaixo dela, cada linha traz o dia do mês e os clientes daquele dia. A aba `ACUMULADO`
é ignorada: as médias saem dos dias.
