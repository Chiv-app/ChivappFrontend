# ==========================================
# Dockerfile Multi-Stage - Chivapp Frontend
# Next.js 16 Standalone en Alpine
# ==========================================

# 1. Dependencias
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# 2. Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Argumentos de compilación para variables públicas en el bundle del cliente
ARG NEXT_PUBLIC_API_URL=/api/v1
ARG NEXT_PUBLIC_SITE_URL=https://chiv.app
ARG NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=
ARG NEXT_PUBLIC_GCS_BUCKET_URL=
ARG NEXT_PUBLIC_GA_ID=

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=$NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY \
    NEXT_PUBLIC_GCS_BUCKET_URL=$NEXT_PUBLIC_GCS_BUCKET_URL \
    NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

RUN npm run build

# 3. Runner (Imagen de producción mínima < 150MB)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME="0.0.0.0"

# Crear usuario de seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar archivos públicos y estáticos
COPY --from=builder /app/public ./public

# Copiar el artefacto standalone generado por Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080

# Ruta interna barata (sin dependencias externas); falla de verdad si el server no responde.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null "http://127.0.0.1:${PORT:-8080}/api/health" || exit 1

CMD ["node", "server.js"]
