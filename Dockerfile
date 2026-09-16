# ─── deps stage ──────────────────────────────────────────────────────
# Terpisah dari builder biar layer ini cuma re-run kalau package-lock.json berubah --
# compile native module (better-sqlite3) adalah bagian paling lama dari build, gak perlu
# diulang tiap kali cuma ngedit komponen.
#
# Pakai "slim" (Debian/glibc), BUKAN alpine -- better-sqlite3 gak punya prebuilt binary
# sama sekali (selalu compile dari source lewat node-gyp, di base image manapun), dan di
# Alpine (musl) node-gyp ambil Node.js header dari mirror komunitas "unofficial-builds.
# nodejs.org" (Node resmi cuma nyediain build glibc) -- mirror itu lebih gampang
# lemot/timeout dari sebagian jaringan. Base glibc ambil header dari nodejs.org/dist
# resmi, jauh lebih reliable. Semua 3 stage HARUS base yang sama (glibc) -- binary native
# hasil compile di builder gak kompatibel kalau runner-nya musl.
FROM node:22-slim AS deps
WORKDIR /app

# python3 make g++ -- buat compile better-sqlite3 (node-gyp). @node-rs/argon2 & sharp
# punya prebuilt binary glibc sendiri, gak butuh ini.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# ─── builder stage ───────────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# DB dibuka eager di lib/db/index.ts -- next build beneran ngeksekusi kode top-level
# module, jadi butuh path yang valid (walau isinya gak dipakai, /tmp cukup) biar gak
# gagal karena folder data/ belum ada di dalam container build.
ENV DATABASE_PATH=/tmp/build.db
RUN npx next build

# ─── runner stage ─────────────────────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_PATH=/app/data/kitab-link.db

# Data dir disiapin + di-chown SEKALI di sini (build time) -- container jalan sebagai
# "node" (non-root) dari awal, gak pernah start sebagai root, jadi gak butuh privilege-
# drop di entrypoint. Named volume (default docker-compose.yml) otomatis warisin
# ownership folder ini pas pertama kali dipasang. Bind mount dari host: operator perlu
# `chown -R 1000:1000` sendiri sekali di host (didokumentasiin di README, bukan di-handle
# otomatis -- biar Dockerfile tetep simpel, gak perlu tool privilege-drop tambahan).
RUN mkdir -p /app/data/uploads && chown -R node:node /app/data

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --chown=node:node docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER node

EXPOSE 3000

# Pakai node built-in fetch (Node 18+), bukan wget/curl -- Debian slim gak ada dua-duanya
# terinstall default, dan nambah paket cuma buat healthcheck itu boros.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# entrypoint cuma buat fix HOSTNAME (lihat docker-entrypoint.sh) -- gak perlu root,
# container jalan sebagai "node" dari awal (USER di atas).
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
