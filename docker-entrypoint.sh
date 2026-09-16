#!/bin/sh
set -e

# Docker otomatis nge-set env var HOSTNAME sendiri (container id) pas container start --
# ini NIMPA `ENV HOSTNAME=0.0.0.0` yang udah ditulis di Dockerfile, bikin Next.js
# standalone server.js coba bind ke situ (bukan 0.0.0.0) dan jadi gak bisa diakses dari
# luar container. Re-set eksplisit di sini, paling akhir sebelum exec, biar menang.
export HOSTNAME=0.0.0.0

# Container start sebagai root (kayak biasa), tapi app-nya jalan sebagai non-root "node".
# Kalau /app/data itu bind mount dari host (bukan named volume), ownership-nya ikut host
# dan uid "node" bisa gak punya izin nulis -- chown dulu di sini sebelum drop privilege,
# jadi user gak perlu `chown` manual di host tiap kali setup volume baru.
if [ "$(id -u)" = "0" ]; then
  mkdir -p /app/data/uploads
  chown -R node:node /app/data
  exec su-exec node "$@"
fi

exec "$@"
