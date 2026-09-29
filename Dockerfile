# DSHub 生产镜像
#
# 提交会把新条目写进 data/plugins.json —— 运行时必须挂一个可写卷：
#   docker run -v $PWD/data:/app/data ...
# 或者直接用同目录的 docker-compose.yml。

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV DSHUB_DATA_DIR=/app/data

RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/data ./data

RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data
USER nextjs

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/plugins?limit=1').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "start"]
