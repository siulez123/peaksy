# Comebolos API

Backend multi-tenant para SaaS de pré-encomendas de padaria white-label.

## 🏗️ Arquitetura

O sistema é multi-tenant, onde cada padaria tem um subdomínio dedicado:
- `padariaX.comebolos.com` - Produção
- `padariaX.comebolos.local` - Desenvolvimento local

A resolução de tenant é feita através do header `Host` da requisição.

## 🚀 Início Rápido

### Pré-requisitos

- Docker e Docker Compose
- Node.js 20+ (para desenvolvimento local)
- Conta Stripe (para pagamentos)

### Configuração

1. Clone o repositório e instale as dependências:

```bash
npm install
```

2. Configure as variáveis de ambiente:

```bash
cp .env.example .env
```

Edite o `.env` e configure:
- `DATABASE_URL` - URL de conexão do PostgreSQL
- `JWT_SECRET` - Chave secreta para JWT (use uma string aleatória forte)
- `STRIPE_SECRET_KEY` - Chave secreta da API Stripe
- `STRIPE_WEBHOOK_SECRET` - Secret do webhook Stripe

3. Inicie os serviços com Docker Compose:

```bash
docker compose up -d
```

4. Execute as migrations e seed:

```bash
# Dentro do container ou localmente
npm run prisma:migrate
npm run prisma:seed
```

5. A API estará disponível em `http://localhost:3000`

## 📚 Documentação da API

A documentação Swagger está disponível em:
- `http://localhost:3000/docs`

## 🔐 Autenticação

### Login de Admin

```bash
POST /auth/login
{
  "email": "admin@padariademo.local",
  "password": "Admin123!",
  "tenantSlug": "padariademo"
}
```

Para **admin de padaria**, `tenantSlug` é obrigatório e tem de ser o slug da padaria dessa conta. **Super admin** não usa `tenantSlug`.

O token JWT retornado deve ser incluído no header `Authorization: Bearer <token>` para endpoints protegidos.

## 🏪 Resolução de Tenant

O sistema resolve automaticamente o tenant (padaria) baseado no header `Host`:

1. **Subdomínio padrão**: `{slug}.comebolos.com` ou `{slug}.comebolos.local`
   - Extrai o slug do subdomínio
   - Busca a padaria no banco de dados
   - Anexa `request.tenant` com informações da padaria

2. **Domínio customizado** (futuro): `{domain}`
   - Busca padaria pelo campo `domain`

3. **Super Admin**: `slicesofbravery.pt` ou `localhost`
   - Permite apenas endpoints `/super/*` e `/auth/*`
   - Não requer tenant

### Exemplo de Uso Local

**Opção 1: Usando header customizado (recomendado para desenvolvimento sem permissões)**

Sem precisar editar `/etc/hosts`, use o header `X-Tenant-Slug`:

```bash
curl -H "X-Tenant-Slug: padariademo" http://localhost:3000/public/products
```

**Opção 2: Usando /etc/hosts (requer permissões de admin)**

Adicione ao seu `/etc/hosts`:

```
127.0.0.1 padariademo.comebolos.local
```

Então faça requisições:
```bash
curl -H "Host: padariademo.comebolos.local" http://localhost:3000/public/products
```

## 👥 Usuários Padrão (Seed)

Após executar o seed, os seguintes usuários estarão disponíveis:

### Super Admin
- **Email**: `super@comebolos.local`
- **Password**: `Admin123!`
- **Acesso**: Endpoints `/super/*` (sem necessidade de tenant)

### Bakery Admin
- **Email**: `admin@padariademo.local`
- **Password**: `Admin123!`
- **Bakery**: Padaria Demo (slug: `padariademo`)
- **Acesso**: Endpoints `/admin/*` (requer tenant `padariademo`)

## 📦 Produtos Padrão (Seed)

A padaria demo vem com os seguintes produtos pré-configurados:

- **Bolo Rei**: 750g, 1Kg, 1,5Kg
- **Pão de Ló**: Pequeno, Médio, Grande
- **Pão de Ló de Papel**: Único
- **Pão de Jamón**: Pequeno, Normal, Sem passas

## 🔄 Webhooks Stripe

Para testar webhooks do Stripe localmente:

1. Instale o Stripe CLI: https://stripe.com/docs/stripe-cli

2. Faça o forward do webhook:

```bash
stripe listen --forward-to localhost:3000/public/webhooks/stripe
```

3. O Stripe CLI fornecerá um webhook secret. Use-o no `.env` como `STRIPE_WEBHOOK_SECRET`

4. Para testar eventos:

```bash
stripe trigger checkout.session.completed
```

## 📋 Endpoints Principais

### Públicos (requerem tenant)
- `GET /public/available-days` - Lista dias disponíveis para retirada
- `GET /public/products?pickupDate=YYYY-MM-DD` - Lista produtos
- `POST /public/checkout` - Cria sessão de checkout Stripe
- `POST /public/webhooks/stripe` - Webhook do Stripe

### Admin (JWT + tenant)
- `GET /admin/products` - Lista produtos
- `POST /admin/products` - Cria produto
- `PATCH /admin/products/:id` - Atualiza produto
- `DELETE /admin/products/:id` - Remove produto
- `GET /admin/available-days` - Lista dias disponíveis
- `POST /admin/available-days` - Cria dia disponível
- `PATCH /admin/available-days/:id` - Atualiza dia disponível
- `GET /admin/orders` - Lista pedidos
- `PATCH /admin/orders/:id/status` - Atualiza status do pedido
- `GET /admin/orders/summary?pickupDate=YYYY-MM-DD` - Resumo para produção

### Super Admin (JWT, sem tenant)
- `GET /super/bakeries` - Lista padarias
- `POST /super/bakeries` - Cria padaria
- `GET /super/users` - Lista usuários
- `POST /super/users` - Cria usuário
- `GET /super/metrics` - Métricas globais
- `GET /super/bakeries/:id/metrics` - Métricas de uma padaria

## 🛠️ Desenvolvimento

### Scripts Disponíveis

```bash
# Desenvolvimento com hot-reload
npm run dev

# Build para produção
npm run build

# Executar em produção
npm start

# Prisma
npm run prisma:generate  # Gera Prisma Client
npm run prisma:migrate   # Executa migrations
npm run prisma:seed      # Executa seed
npm run prisma:studio    # Abre Prisma Studio
```

### Estrutura do Projeto

```
src/
  /plugins          # Plugins Fastify (prisma, swagger, auth, tenant, rate-limit)
  /modules
    /auth           # Rotas de autenticação
    /public         # Rotas públicas (checkout, produtos, etc)
    /admin          # Rotas de admin da padaria
    /super          # Rotas de super admin
  /lib              # Utilitários (errors, dates, logger)
  server.ts         # Arquivo principal
```

## 🔒 Segurança

- **Isolamento de tenant**: Todas as queries de admin filtram por `bakeryId`
- **Rate limiting**: Aplicado em `/auth/login` e `/public/checkout`
- **Validação**: Todas as requisições são validadas com Zod
- **JWT**: Autenticação baseada em tokens
- **Stripe**: Webhooks verificados por assinatura

## 📝 Regras de Negócio

### Pedidos
- Clientes só podem pedir para datas **estritamente no futuro** (não no mesmo dia)
- Pedidos só são aceitos se o dia estiver ativo e antes do `orderDeadline`
- Caps são verificados apenas contra pedidos **pagos** (MVP)
- Status: `RECEIVED` → `READY` → `PICKED_UP`

### Datas
- Comparações de "hoje" usam o timezone da padaria (padrão: `Europe/Lisbon`)
- `pickupDate` deve ser estritamente maior que hoje

## 🐳 Docker (Desenvolvimento Local)

O projeto inclui `docker-compose.yml` com:
- **PostgreSQL 16**: Banco de dados
- **API**: Servidor Node.js com hot-reload

Para parar os serviços:

```bash
docker compose down
```

Para ver logs:

```bash
docker compose logs -f api
```

## 🚂 Deploy no Railway

O projeto está configurado para deploy no Railway. Veja o guia completo em [RAILWAY.md](./RAILWAY.md).

**Resumo rápido:**
1. Conecte seu repositório ao Railway
2. Adicione um PostgreSQL
3. Configure as variáveis de ambiente
4. Execute migrations: `railway run npm run prisma:migrate`
5. Execute seed: `railway run npm run prisma:seed`

## 📄 Licença

ISC

