# Build completo: API Fastify + frontend Vite (web/dist servido pelo mesmo processo em produção)
FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package.json package-lock.json* ./
COPY web/package.json web/package-lock.json* ./web/
COPY prisma ./prisma/
COPY patches ./patches/

RUN npm ci
RUN cd web && npm ci

COPY . .

RUN npm run prisma:generate
RUN cd web && npm run build
RUN npm run build
RUN npm prune --omit=dev

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "run", "start:railway"]
