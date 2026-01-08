FROM node:20-alpine

WORKDIR /app

# Install OpenSSL and other dependencies for Prisma
RUN apk add --no-cache openssl openssl-dev libc6-compat

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (needed for build)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client and build
RUN npm run prisma:generate
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

EXPOSE 3000

# Use production start command
CMD ["npm", "start"]

