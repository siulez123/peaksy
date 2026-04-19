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
| `STRIPE_SECRET_KEY` | Chave secreta Stripe. **Podes deixar em branco** para testar só o site e a API; o checkout de pagamento só funciona com chave definida. |
| `STRIPE_WEBHOOK_SECRET` | Segredo do webhook Stripe; endpoint `https://<teu-dominio>/public/webhooks/stripe`. Opcional até configurares pagamentos. |

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
