# 🧪 Como Testar os Endpoints

## Problema Atual

O header `X-Tenant-Slug` não está funcionando corretamente. Use uma das soluções abaixo:

## Solução 1: Usar Host Header (Recomendado)

```bash
# Listar produtos
curl -H "Host: padariademo.comebolos.local" http://localhost:3000/public/products

# Fazer login (admin de padaria: incluir tenantSlug)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@padariademo.local","password":"Admin123!","tenantSlug":"padariademo"}'
```

## Solução 2: Endpoints que não precisam de tenant

```bash
# Health check
curl http://localhost:3000/health

# Swagger docs
open http://localhost:3000/docs

# Login admin de padaria (tenantSlug obrigatório)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@padariademo.local","password":"Admin123!","tenantSlug":"padariademo"}'
```

## Solução 3: Endpoints Super Admin (não precisam de tenant)

```bash
# Listar padarias (precisa de token JWT)
curl -H "Authorization: Bearer SEU_TOKEN" http://localhost:3000/super/bakeries
```

## Status Atual

- ✅ Servidor rodando: http://localhost:3000
- ✅ Health check funcionando
- ✅ Swagger docs: http://localhost:3000/docs
- ✅ Login funcionando (sem tenant)
- ⚠️ Endpoints públicos precisam do header Host correto
- ⚠️ Header X-Tenant-Slug não está funcionando ainda

## Próximos Passos

1. Corrigir o header X-Tenant-Slug
2. Ou usar o header Host nas requisições

