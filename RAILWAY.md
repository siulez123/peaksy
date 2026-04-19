# Deploy no Railway

Um único **serviço** Docker serve a API e o frontend estático (`web/dist`) na mesma origem.

## Healthcheck a falhar (“service unavailable” no `/health`)

O servidor **não chega a escutar** na porta se o processo morrer no arranque. Causas típicas:

1. **Falta `JWT_SECRET`** — o arranque lança erro e o contentor termina. **Obrigatório** definir (ex.: `openssl rand -base64 32`).
2. **`prisma migrate deploy` falha** — `DATABASE_URL` errada ou Postgres ainda não ligado ao serviço. Vê **Deploy Logs** (mensagens do Prisma).
3. Não é preciso definir `PORT` manualmente — a Railway injeta-o.

## Passos

1. Cria um projeto na [Railway](https://railway.app) e liga o repositório Git deste projeto.
2. Adiciona a base de dados **PostgreSQL** (plugin) e copia a variável `DATABASE_URL` para o serviço da aplicação (ou usa a referência `${{Postgres.DATABASE_URL}}` na UI).
3. Define as variáveis abaixo no serviço da app.
4. O arranque corre **`prisma migrate deploy`** antes do Node (`npm start`). Se na Railway tiveres **Start Command** personalizado, usa `npm start` ou `npx prisma migrate deploy && node dist/server.js` — **não** uses só `node dist/server.js` ou as tabelas não são criadas.

### Dados iniciais (seed) — 404 na loja ou 401 no login

O `migrate deploy` **não** insere utilizadores nem padarias. Se vires:

- `Bakery with slug 'padariademo' not found or inactive`, ou
- `Invalid credentials` com `super@comebolos.local` / `Admin123!`,

é porque a base de dados de produção **ainda não correu o seed** (`prisma/seed.ts`), que cria a padaria demo, o super admin e o admin da padaria.

**Corre o seed uma vez** a partir do teu computador (com o projeto instalado: `npm install`).

**Importante:** no plugin **Postgres** da Railway existem dois URLs diferentes:

| Variável | Onde funciona |
|----------|----------------|
| `DATABASE_URL` | Host `postgres.railway.internal` — **só dentro** da rede Railway (contentores no mesmo projeto). |
| `DATABASE_PUBLIC_URL` | Host tipo `*.proxy.rlwy.net` com porta alta — para **ligares a partir do teu Mac** (Prisma, GUI, seed local). |

Se usares `railway run npx prisma db seed` ou copiares só o `DATABASE_URL` do Postgres, o Prisma tenta `postgres.railway.internal:5432` e falha com *Can't reach database server* — **a BD está a correr**; o teu portátil simplesmente não alcança o hostname interno.

**Seed local (recomendado):** no dashboard Railway → serviço **Postgres** → **Variables** → copia **`DATABASE_PUBLIC_URL`** e corre:

```bash
cd /caminho/para/comebolos
# Ligação externa ao proxy da Railway quase sempre precisa de SSL:
export DATABASE_URL="postgresql://...@roundhouse.proxy.rlwy.net:PORTA/railway?sslmode=require"
npx prisma db seed
```

Cola o URL completo e **acrescenta** `?sslmode=require` no fim (ou `&sslmode=require` se o URL já tiver `?`). Sem isto, o Prisma pode falhar com *Can't reach database server* mesmo com host e porta corretos.

(Não precisas de `railway run` para isto; o `DATABASE_URL` tem de ser o **público**. Se ainda falhar, testa rede/VPN/firewall ou corre o seed **dentro** da Railway — ver alternativa abaixo.)

#### `railway connect`, `psql` no macOS — erro GSSAPI

Se vires `could not initiate GSSAPI security context` ou *Credential for asked mech-type*, o cliente `psql` (Homebrew) está a tentar **Kerberos/GSSAPI** antes da password. Desativa só para esta sessão:

```bash
export PGGSSENCMODE=disable
railway connect Postgres
```

Ou com URL manual (usa o `DATABASE_PUBLIC_URL` + `?sslmode=require`):

```bash
PGGSSENCMODE=disable psql "postgresql://USER:PASS@HOST:PORT/railway?sslmode=require"
```

Depois disto, o *server closed the connection unexpectedly* costuma desaparecer se era efeito em cadeia do primeiro erro.

#### Prisma (`npx prisma db seed`) no mesmo Mac

Geralmente **não** passa pelo mesmo caminho GSSAPI que o `psql`. Mantém `DATABASE_URL` com **`?sslmode=require`**. Se ainda falhar, tenta na mesma shell:

```bash
export PGGSSENCMODE=disable
export DATABASE_URL="...PUBLIC_URL...?sslmode=require"
npx prisma db seed
```

#### Log do Postgres: `relation "pg_stat_statements" does not exist`

Isso vem do **painel/métricas da Railway** a consultar a extensão `pg_stat_statements`, que pode não estar instalada. **Não impede** a app nem clientes externos; podes ignorar ou, como superuser, `CREATE EXTENSION IF NOT EXISTS pg_stat_statements;` para silenciar o erro.

#### Correr o seed **na Railway** (rede corporativa / bloqueio ao Postgres público)

O comando `railway run` **ainda executa no teu PC** — só injeta variáveis. Para não dependeres da rede da empresa a alcançar `*.proxy.rlwy.net`, usa um destes métodos (a BD é alcançada **por dentro** da Railway com `postgres.railway.internal`).

**1. SSH no contentor do serviço da aplicação** ([`railway ssh`](https://docs.railway.app/guides/cli))

- Faz `railway link` ao **serviço da app** (Comebolos / API), **não** ao plugin Postgres.
- No contentor, o `DATABASE_URL` já aponta para a BD interna — não precisas do URL público.

No Dockerfile, após `npm prune --omit=dev`, o `tsx` pode não estar instalado; o `npx tsx` descarrega-o quando necessário:

```bash
railway ssh -- sh -lc 'cd /app && npx prisma generate && npx tsx prisma/seed.ts'
```

(Ajusta `/app` se o `WORKDIR` no teu deploy for outro; vê o Dockerfile.)

**2. Start Command temporário (um deploy, depois repõe)**

Na Railway → serviço da app → **Settings** → **Start Command**, substitui **temporariamente** por algo como:

```bash
sh -c "npx prisma migrate deploy && npx tsx prisma/seed.ts && node dist/server.js"
```

Faz **um** deploy; quando o serviço estiver saudável, **volta** ao comando normal (`npm start` ou equivalente). **Atenção:** o seed atual **apaga e recria** dados de demo para certos slugs; não deixes isto permanente ou cada redeploy repete o seed.

**3. CI noutro sítio (GitHub Actions, etc.)**

Workflow que corre `npx prisma db seed` com `DATABASE_URL` num secret (podes usar o URL **público** com `?sslmode=require`). Corre nos servidores do GitHub, não no PC da empresa.

---

Depois do seed bem sucedido, `/loja/padariademo` e o login do super admin com as credenciais do README devem funcionar. **Em produção real**, altera passwords e não relies nos dados de demo.

## Variáveis obrigatórias

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | URL do Postgres (Railway preenche ao ligar o plugin). |
| `JWT_SECRET` | Segredo forte para assinar tokens (gera um string longo aleatório). |

## Variáveis recomendadas

| Variável | Descrição |
|----------|-----------|
| `FRONTEND_URL` | URL pública do teu serviço (ex.: `https://xxx.up.railway.app`). Usada no Stripe para redirecionamentos após pagamento. Deve coincidir com o domínio onde os clientes abrem a loja. |
| `STRIPE_SECRET_KEY` | Chave secreta Stripe. **Podes deixar em branco** para testar só o site e a API; o checkout de pagamento só funciona com chave definida. |
| `STRIPE_WEBHOOK_SECRET` | Segredo do webhook Stripe; endpoint `https://<teu-dominio>/public/webhooks/stripe`. Opcional até configurares pagamentos. |

## Opcionais

| Variável | Descrição |
|----------|-----------|
| `LOG_LEVEL` | Ex.: `info` (predefinido). |
| `WEB_DIST_PATH` | Caminho alternativo ao build do frontend (predefinido: `web/dist`). |
| `HOST` | Predefinido `0.0.0.0`. |
| `PORT` | A Railway define automaticamente. |

## Domínio e URLs da loja

No URL por defeito da Railway (`https://<serviço>.up.railway.app`) **não há subdomínio por padaria**. O host é só da plataforma; o resolver **não** exige tenant nesse caso.

| O que queres | URL (exemplo) |
|----------------|---------------|
| Página inicial da plataforma (super admin, texto genérico) | `https://comebolos.up.railway.app/` |
| Loja da padaria `padariademo` (slug na path) | `https://comebolos.up.railway.app/loja/padariademo` |
| Login admin dessa padaria | `https://comebolos.up.railway.app/admin/padariademo/entrar` |
| Super admin | `https://comebolos.up.railway.app/super/entrar` |

Com **domínio próprio** no formato `padariademo.comebolos.com` (DNS a apontar para o Railway), o tenant pode ser resolvido pelo `Host` sem `/loja/...` — vê `src/plugins/tenantResolver.ts` e `VITE_APP_DOMAIN` no frontend.

Em desenvolvimento usa-se muitas vezes o header `X-Tenant-Slug`; o browser envia-o nas chamadas à API quando estás numa rota com slug.

## Build local do Docker

```bash
docker build -t comebolos .
docker run --rm -p 3000:3000 -e DATABASE_URL="postgresql://..." -e JWT_SECRET="..." comebolos
```

Abre `http://localhost:3000/health` e a raiz para o site.
