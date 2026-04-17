# 🚀 Guia Rápido - Como Arrancar o Projeto

## Passo 1: Criar arquivo .env

Crie um arquivo `.env` na raiz do projeto com:

```env
DATABASE_URL="postgresql://comebolos:comebolos_dev@localhost:5433/comebolos"
JWT_SECRET="your-super-secret-jwt-key-change-in-production-min-32-chars"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
# URL da loja (Vite); necessário para o Stripe redirecionar de volta após pagamento
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"
PORT=3000
```

## Passo 2: Iniciar Docker Compose

```bash
docker compose up -d
```

Isso vai iniciar o PostgreSQL na porta 5432.

## Passo 3: Executar Migrations e Seed

```bash
# Gerar Prisma Client
npm run prisma:generate

# Executar migrations
npm run prisma:migrate

# Popular banco com dados iniciais
npm run prisma:seed
```

## Passo 4: Iniciar o servidor

```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3000`

## 🛒 Simular uma compra (fluxo completo em teste)

Usa **chaves de teste** do Stripe (`sk_test_...`). No Dashboard não é cobrado dinheiro real.

### 1. Arranca API + base de dados

Como nos passos 2–4 acima (`docker compose`, migrations, seed, `npm run dev` na raiz).

### 2. Webhook local (para o pedido ficar “pago” na base de dados)

Sem isto, o pagamento no Stripe **funciona** e és redirecionado para a página de sucesso, mas o servidor **não** recebe o evento e a encomenda pode ficar `paid: false` (e sem SMS/email).

Num terminal à parte:

```bash
stripe listen --forward-to localhost:3000/public/webhooks/stripe
```

O CLI mostra um **webhook signing secret** (`whsec_...`). Coloca-o no `.env` como `STRIPE_WEBHOOK_SECRET` e **reinicia** a API (`npm run dev`).

### 3. Arranca a loja (frontend)

```bash
cd web && npm install && npm run dev
```

Abre `http://localhost:5173/loja/padariademo` (ou o slug da padaria após seed).

### 4. Confirma `FRONTEND_URL`

No `.env` da **raiz** (API), deve existir `FRONTEND_URL=http://localhost:5173` para o Stripe redirecionar para `/loja/:slug/sucesso` após pagar.

### 5. Faz um pedido de teste

1. Escolhe um dia de levantamento com encomendas abertas.
2. Adiciona produtos ao carrinho → **Encomendar** → preenche nome e telefone.
3. **Continuar para pagamento** → abre o Checkout Stripe (hosted).
4. Cartão de teste:
   - **Número:** `4242 4242 4242 4242`
   - **Validade:** qualquer data futura (ex.: 12/34)
   - **CVC:** 3 dígitos (ex.: 123)
   - **Nome** e código postal se pedidos: valores fictícios servem.
5. Completa o pagamento → deves ser enviado para **Pagamento recebido** (`/loja/padariademo/sucesso?session_id=...`).

### 6. Verificar

- **Loja:** mensagem de sucesso com o `session_id` na página.
- **Admin:** `http://localhost:5173/admin/padariademo/pedidos` (login `admin@padariademo.local` / `Admin123!`) — a encomenda deve aparecer como paga se o webhook correu.

**MB WAY / outros métodos:** em teste, o Stripe mostra o que tiveres ativo na conta; o fluxo mais simples para simular é sempre o **cartão** `4242...`.

## 🧪 Testar sem editar /etc/hosts

Como você não tem permissões para editar `/etc/hosts`, use o header `X-Tenant-Slug`:

```bash
# Listar produtos da padaria demo
curl -H "X-Tenant-Slug: padariademo" http://localhost:3000/public/products

# Fazer login como admin da padaria
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@padariademo.local","password":"Admin123!"}'

# Usar o token retornado para acessar endpoints admin
curl -H "X-Tenant-Slug: padariademo" \
     -H "Authorization: Bearer SEU_TOKEN_AQUI" \
     http://localhost:3000/admin/products
```

## 📚 Documentação Swagger

Acesse: http://localhost:3000/docs

## 👤 Usuários Padrão (após seed)

- **Super Admin**: `super@comebolos.local` / `Admin123!`
- **Bakery Admin**: `admin@padariademo.local` / `Admin123!`

## 🛑 Parar os serviços

```bash
docker compose down
```

