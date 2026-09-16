#!/bin/sh
set -e

# Docker otomatis nge-set env var HOSTNAME sendiri (container id) pas container start --
# ini NIMPA `ENV HOSTNAME=0.0.0.0` yang udah ditulis di Dockerfile, bikin Next.js
# standalone server.js coba bind ke situ (bukan 0.0.0.0) dan jadi gak bisa diakses dari
# luar container. Re-set eksplisit di sini, paling akhir sebelum exec, biar menang.
export HOSTNAME=0.0.0.0

exec "$@"
