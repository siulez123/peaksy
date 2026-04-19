# Deploy no Railway

Um único **serviço** Docker serve a API e o frontend estático (`web/dist`) na mesma origem.

## Passos

1. Cria um projeto na [Railway](https://railway.app) e liga o repositório Git deste projeto.
2. Adiciona a base de dados **PostgreSQL** (plugin) e copia a variável `DATABASE_URL` para o serviço da aplicação (ou usa a referência `${{Postgres.DATABASE_URL}}` na UI).
3. Define as variáveis abaixo no serviço da app.
4. O primeiro deploy corre `prisma migrate deploy` antes de iniciar o servidor (`npm run start:railway`).

## Variáveis obrigatórias

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | URL do Postgres (Railway preenche ao ligar o plugin). |
| `JWT_SECRET` | Segredo forte para assinar tokens (gera um string longo aleatório). |

## Variáveis recomendadas

| Variável | Descrição |
|----------|-----------|
| `FRONTEND_URL` | URL pública do teu serviço (ex.: `https://xxx.up.railway.app`). Usada no Stripe para redirecionamentos após pagamento. Deve coincidir com o domínio onde os clientes abrem a loja. |
| `STRIPE_SECRET_KEY` | Chave secreta Stripe (modo test ou live). |
| `STRIPE_WEBHOOK_SECRET` | Segredo do webhook Stripe; configura o endpoint `https://<teu-dominio>/public/webhooks/stripe` no dashboard Stripe. |

## Opcionais

| Variável | Descrição |
|----------|-----------|
| `LOG_LEVEL` | Ex.: `info` (predefinido). |
| `WEB_DIST_PATH` | Caminho alternativo ao build do frontend (predefinido: `web/dist`). |
| `HOST` | Predefinido `0.0.0.0`. |
| `PORT` | A Railway define automaticamente. |

## Domínio e subdomínios de padarias

- O **tenant** pode ser resolvido por cabeçalho `Host` (`padariademo.teudominio.com`) se configurares DNS a apontar para o Railway e o plugin de tenant no backend estiver alinhado com o domínio em produção.
- Em desenvolvimento usa-se muitas vezes `X-Tenant-Slug`; em produção confirma o comportamento em `src/plugins/tenantResolver.ts` e variáveis como `VITE_APP_DOMAIN` no frontend se aplicável.

## Build local do Docker

```bash
docker build -t comebolos .
docker run --rm -p 3000:3000 -e DATABASE_URL="postgresql://..." -e JWT_SECRET="..." comebolos
```

Abre `http://localhost:3000/health` e a raiz para o site.
