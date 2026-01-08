# 🚀 Guia Rápido - Como Arrancar o Projeto

## Passo 1: Criar arquivo .env

Crie um arquivo `.env` na raiz do projeto com:

```env
DATABASE_URL="postgresql://comebolos:comebolos_dev@localhost:5433/comebolos"
JWT_SECRET="your-super-secret-jwt-key-change-in-production-min-32-chars"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
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

