# Peaksy API

Backend da plataforma **Peaksy** — SaaS multi-tenant de pré-encomendas em white-label (lojas e outros negócios com levantamento agendado).

## 🏗️ Arquitetura

Cada **tenant** (ex.: uma loja) pode ter subdomínio dedicado ou domínio próprio:

- `{slug}.peaksy.com` — produção (subdomínio da plataforma)
- `{slug}.peaksy.local` — desenvolvimento local

A resolução de tenant é feita pelo header `Host`, por domínio personalizado na base de dados, ou por `X-Tenant-Slug` em desenvolvimento.

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
  "email": "admin@lojademo.local",
  "password": "Admin123!",
  "tenantSlug": "lojademo"
}
```

Para **admin de loja**, `tenantSlug` é obrigatório e tem de ser o slug da loja dessa conta. **Super admin** não usa `tenantSlug`.

O token JWT retornado deve ser incluído no header `Authorization: Bearer <token>` para endpoints protegidos.

## 🏪 Resolução de Tenant

O sistema resolve automaticamente o tenant (loja) baseado no header `Host`:

1. **Subdomínio padrão**: `{slug}.peaksy.com` ou `{slug}.peaksy.local`
   - Extrai o slug do subdomínio
   - Busca a loja no banco de dados
   - Anexa `request.tenant` com informações da loja

2. **Domínio customizado** (futuro): `{domain}`
   - Busca loja pelo campo `domain`

3. **Super Admin**: `slicesofbravery.pt` ou `localhost`
   - Permite apenas endpoints `/super/*` e `/auth/*`
   - Não requer tenant

### Exemplo de Uso Local

**Opção 1: Usando header customizado (recomendado para desenvolvimento sem permissões)**

Sem precisar editar `/etc/hosts`, use o header `X-Tenant-Slug`:

```bash
curl -H "X-Tenant-Slug: lojademo" http://localhost:3000/public/products
```

**Opção 2: Usando /etc/hosts (requer permissões de admin)**

Adicione ao seu `/etc/hosts`:

```
127.0.0.1 lojademo.peaksy.local
```

Então faça requisições:
```bash
curl -H "Host: lojademo.peaksy.local" http://localhost:3000/public/products
```

## 👥 Usuários Padrão (Seed)

Após executar o seed, os seguintes usuários estarão disponíveis:

### Super Admin
- **Email**: `super@peaksy.local`
- **Password**: `Admin123!`
- **Acesso**: Endpoints `/super/*` (sem necessidade de tenant)

### Loja Admin
- **Email**: `admin@lojademo.local`
- **Password**: `Admin123!`
- **Loja demo**: Loja Demo (slug: `lojademo`)
- **Acesso**: Endpoints `/admin/*` (requer tenant `lojademo`)

## 📦 Produtos Padrão (Seed)

A loja demo vem com os seguintes produtos pré-configurados:

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
- `GET /super/lojas` - Lista lojas
- `POST /super/lojas` - Cria loja
- `GET /super/users` - Lista usuários
- `POST /super/users` - Cria usuário
- `GET /super/metrics` - Métricas globais
- `GET /super/lojas/:id/metrics` - Métricas de uma loja

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
    /admin          # Rotas de admin da loja
    /super          # Rotas de super admin
  /lib              # Utilitários (errors, dates, logger)
  server.ts         # Arquivo principal
```

## 🔒 Segurança

- **Isolamento de tenant**: Todas as queries de admin filtram por `lojaId`
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
- Comparações de "hoje" usam o timezone da loja (padrão: `Europe/Lisbon`)
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

