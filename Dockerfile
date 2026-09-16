# ─── deps stage ──────────────────────────────────────────────────────
# Terpisah dari builder biar layer ini cuma re-run kalau package-lock.json berubah --
# compile native module (better-sqlite3) adalah bagian paling lama dari build, gak perlu
# diulang tiap kali cuma ngedit komponen.
FROM node:22-alpine AS deps
WORKDIR /app

# python3 make g++ -- cuma buat compile better-sqlite3 di musl/Alpine (node-gyp).
# @node-rs/argon2 & sharp punya prebuilt binary musl sendiri, gak butuh ini.
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

# ─── builder stage ───────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# DB dibuka eager di lib/db/index.ts -- next build beneran ngeksekusi kode top-level
# module, jadi butuh path yang valid (walau isinya gak dipakai, /tmp cukup) biar gak
# gagal karena folder data/ belum ada di dalam container build.
ENV DATABASE_PATH=/tmp/build.db
RUN npx next build

# ─── runner stage ─────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# su-exec -- buat drop dari root ke user "node" di entrypoint (lihat docker-entrypoint.sh),
# jauh lebih kecil dari gosu/sudo.
RUN apk add --no-cache su-exec

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_PATH=/app/data/kitab-link.db

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://127.0.0.1:3000/api/health || exit 1

# Start sebagai root (default) -- entrypoint yang urus chown /app/data lalu drop ke
# user "node" sebelum exec node server.js. JANGAN set USER node di sini, entrypoint-nya
# butuh root buat chown volume yang baru di-mount.
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
