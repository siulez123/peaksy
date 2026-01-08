# 🚂 Deploy no Railway

Guia para fazer deploy do Comebolos API no Railway.

## 📋 Pré-requisitos

1. Conta no [Railway](https://railway.app)
2. Conta no Stripe (para pagamentos)
3. Git repository (GitHub/GitLab)

## 🚀 Passo a Passo

### 1. Criar Projeto no Railway

1. Acesse [railway.app](https://railway.app)
2. Clique em "New Project"
3. Selecione "Deploy from GitHub repo" (ou GitLab)
4. Conecte seu repositório e selecione o projeto `comebolos`

### 2. Adicionar PostgreSQL

1. No projeto Railway, clique em "+ New"
2. Selecione "Database" → "Add PostgreSQL"
3. Railway criará automaticamente um PostgreSQL e exporá a variável `DATABASE_URL`

### 3. Configurar Variáveis de Ambiente

No projeto Railway, vá em "Variables" e adicione:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-change-in-production
STRIPE_SECRET_KEY=sk_live_... (ou sk_test_... para testes)
STRIPE_WEBHOOK_SECRET=whsec_...
NODE_ENV=production
```

**Nota:** `PORT` é definido automaticamente pelo Railway, não precisa configurar.

**Importante:**
- `DATABASE_URL` será preenchido automaticamente pelo Railway quando você adicionar o PostgreSQL
- `JWT_SECRET` deve ser uma string aleatória forte (mínimo 32 caracteres)
- `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` vêm da sua conta Stripe

### 4. Executar Migrations

Após o primeiro deploy, você precisa executar as migrations:

**Opção 1: Via Railway CLI**
```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link ao projeto
railway link

# Executar migrations
railway run npm run prisma:migrate

# Executar seed (opcional)
railway run npm run prisma:seed
```

**Opção 2: Via Railway Dashboard**
1. Vá em "Deployments"
2. Clique nos três pontos do último deployment
3. Selecione "Open Shell"
4. Execute:
```bash
npm run prisma:migrate
npm run prisma:seed
```

### 5. Configurar Domínio (Opcional)

1. No projeto Railway, vá em "Settings"
2. Em "Networking", clique em "Generate Domain"
3. Railway criará um domínio como `seu-projeto.up.railway.app`

### 6. Configurar Webhook do Stripe

1. No dashboard do Stripe, vá em "Developers" → "Webhooks"
2. Clique em "Add endpoint"
3. URL: `https://seu-dominio.railway.app/public/webhooks/stripe`
   - Substitua `seu-dominio` pelo domínio gerado pelo Railway
4. Selecione o evento: `checkout.session.completed`
5. Copie o "Signing secret" (começa com `whsec_`)
6. Adicione como `STRIPE_WEBHOOK_SECRET` nas variáveis de ambiente do Railway

## 🔧 Configurações Adicionais

### Health Check

O Railway verificará automaticamente o endpoint `/health` para health checks.

### Logs

Acesse os logs em tempo real no dashboard do Railway em "Deployments" → "View Logs"

### Variáveis de Ambiente Sensíveis

Para variáveis sensíveis, use o Railway Secrets:
1. Vá em "Variables"
2. Marque a variável como "Secret"
3. Ela será ocultada nos logs

## 📝 Notas Importantes

1. **Migrations**: Execute `prisma migrate deploy` (não `migrate dev`) em produção
2. **Seed**: Execute apenas uma vez após o primeiro deploy
3. **Port**: Railway define automaticamente a variável `PORT`, mas você pode usar `3000` como fallback
4. **Tenant Resolution**: Em produção, use o header `Host` correto ou configure domínios customizados

## 🧪 Testar após Deploy

Após o deploy, teste os endpoints:

```bash
# Health check
curl https://seu-dominio.railway.app/health

# Swagger docs (abra no navegador)
https://seu-dominio.railway.app/docs

# Produtos (com header X-Tenant-Slug - funciona em dev e produção)
curl -H "X-Tenant-Slug: padariademo" \
     https://seu-dominio.railway.app/public/products

# Login (super admin)
curl -X POST https://seu-dominio.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"super@comebolos.local","password":"Admin123!"}'
```

**Nota:** O header `X-Tenant-Slug` funciona tanto em desenvolvimento quanto em produção. Em produção, você também pode usar o header `Host` correto:
```bash
curl -H "Host: padariademo.comebolos.com" \
     https://seu-dominio.railway.app/public/products
```

## 🔄 Atualizações

Para atualizar o projeto:
1. Faça push para o repositório Git
2. Railway detectará automaticamente e fará novo deploy
3. Se você adicionou novas migrations, execute: `railway run npm run prisma:migrate`

**Nota:** O Railway faz rebuild automático a cada push. Não é necessário fazer nada manual além de executar migrations se houver mudanças no schema.

## 🐛 Troubleshooting

### Erro: "Prisma client not available"
- Verifique se `DATABASE_URL` está configurado
- Execute `npm run prisma:generate` no shell do Railway

### Erro: "Database connection failed"
- Verifique se o PostgreSQL está rodando
- Confirme que `DATABASE_URL` está correto

### Erro: "Port already in use"
- Railway define `PORT` automaticamente, não precisa configurar manualmente

## 📚 Recursos

- [Railway Docs](https://docs.railway.app)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)

