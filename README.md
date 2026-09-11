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

## Login

O painel inteiro fica atrás de login. Quem chega sem sessão cai em `/cadastro`, onde cria
a conta e já entra, ou segue o link para `/login`. O cadastro é aberto: qualquer pessoa com
o link cria uma conta (o painel não guarda dados no servidor; as planilhas só existem no
navegador de quem as carrega). Configure no `.env.local` — e nas variáveis de ambiente do servidor em produção:

```bash
SUPABASE_URL=https://evkivockfdvhygqguxeo.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...  # Supabase → Project Settings → API Keys (pública)
SUPABASE_CHAVE_SERVIDOR=...                  # segredo; o hash dela fica em privado.chave_servidor
SESSAO_SEGREDO=$(openssl rand -base64 32)    # 32+ caracteres; trocar derruba todas as sessões
```

Os usuários ficam na tabela `usuarios` do Supabase (projeto `dashboard-fazendinha`), com a
senha em bcrypt. O schema está em `supabase/migrations/`.

O cadastro só cria: um usuário que já existe não é sobrescrito. Para trocar uma senha ou
remover um acesso, rode no SQL Editor do Supabase:

```sql
insert into usuarios (usuario, senha_hash)
values ('ana', extensions.crypt('senha-da-ana', extensions.gen_salt('bf', 10)))
on conflict (usuario) do update set senha_hash = excluded.senha_hash;

delete from usuarios where usuario = 'ana';  -- remover acesso
```

A tabela não é exposta pela API. Login e cadastro chamam as funções `confere_login` e
`cria_usuario`, que recusam qualquer chamada sem a `SUPABASE_CHAVE_SERVIDOR` — a chave
publishable sozinha não faz nada. O banco guarda só o sha256 dela, no schema `privado`
(fora da API). Para trocá-la, gere uma nova, rode
`insert into privado.chave_servidor values (extensions.digest('<nova>', 'sha256'));`,
atualize a variável na Vercel e depois apague o hash antigo.

A sessão é um cookie `httpOnly` assinado (HMAC-SHA256), válido por 12 horas. Não há
limite de tentativas: se o painel ficar exposto na internet, ponha rate limit na borda.

## Estrutura da planilha

**Vendas** — uma aba por semana (`SEMANA 1`…`SEMANA 5`) e uma de `FECHAMENTO`.
A célula `REFERENCIA` ancora o bloco; nas linhas abaixo dela vêm `TOTAL CLIENTES`,
`FATURAMENTO` e `TICKET MÉDIO`, com 2024, 2025 e 2026 nas colunas seguintes.
As variações são recalculadas pelo painel.

**Clientes** — uma aba por mês. A linha `META CLIENTES` marca as duas colunas de clube;
abaixo dela, cada linha traz o dia do mês e os clientes daquele dia. A aba `ACUMULADO`
é ignorada: as médias saem dos dias.

## Observações

Cada template tem onde anotar feriados e eventos, e o painel mostra a nota junto do dado:

| Planilha | Onde escrever | Onde aparece |
|---|---|---|
| Clientes | bloco `OBSERVAÇÕES` (colunas G/H): dia e texto | dia em destaque no eixo, nota no tooltip e na lista abaixo do gráfico |
| Vendas | célula ao lado de `OBSERVAÇÃO`, uma por aba | tooltip da semana e lista no fechamento |
| Evento | célula ao lado de `OBSERVAÇÕES`, na ficha técnica | subtítulo do painel |

Planilhas sem esses blocos continuam sendo lidas normalmente.

Também dá para anotar pelo painel: clique numa barra ou num ponto do gráfico (ou escolha
a semana/dia/data no campo **Observações**) e escreva. Essas notas ficam no `localStorage`
do navegador — não voltam para a planilha nem aparecem para outras pessoas.

## Filtros

Cada seção tem uma linha de filtros acima dos gráficos que ela recorta:

- **Vendas** — semanas e anos (a variação só aparece com dois anos seguidos marcados).
- **Clientes** — dias da semana; médias, anéis e dias na meta são recalculados só com os dias marcados.
- **Evento** — lotes e canais, recortando o ritmo de venda e a origem da venda. Ficha, metas e investimento seguem inteiros.
