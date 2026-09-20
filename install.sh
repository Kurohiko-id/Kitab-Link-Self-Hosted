#!/usr/bin/env bash
# Kitab Link — one-command installer.
#
#   curl -fsSL https://raw.githubusercontent.com/Kurohiko-id/Kitab-Link-Self-Hosted/main/install.sh | bash
#
# Kenapa perlu script ini (bukan cuma docker-compose.yml polos): kalau VPS-nya udah ada
# app lain di belakang Caddy (kasus yang sangat umum -- 1 VPS, banyak domain), install
# manual butuh ~7 langkah (bikin folder, edit compose, hapus port, tambah network, install
# Caddy, tulis Caddyfile, reload). Script ini deteksi kondisi VPS-nya dan ngerjain semua
# langkah itu otomatis, idempotent (aman dijalanin ulang).

set -euo pipefail

# Warna cuma dinyalain kalau output-nya beneran ke terminal -- kalau di-pipe/redirect
# ke file/log, kode escape ANSI bakal jadi sampah karakter di outputnya.
if [ -t 1 ]; then
  BOLD='\033[1m'; BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; NC='\033[0m'
else
  BOLD=''; BLUE=''; GREEN=''; YELLOW=''; RED=''; NC=''
fi
info()    { printf "%b\n" "${BLUE}i${NC}  $*"; }
success() { printf "%b\n" "${GREEN}✓${NC}  $*"; }
warn()    { printf "%b\n" "${YELLOW}!${NC}  $*"; }

printf "%b" "${BLUE}"
cat << 'BANNER'
  _  _____ _____  _    ____    _     ___ _   _ _  __
 | |/ /_ _|_   _|/ \  | __ )  | |   |_ _| \ | | |/ /
 | ' / | |  | | / _ \ |  _ \  | |    | ||  \| | ' /
 | . \ | |  | |/ ___ \| |_) | | |___ | || |\  | . \
 |_|\_\___| |_/_/   \_\____/  |_____|___|_| \_|_|\_\
BANNER
printf "%b" "${NC}${BOLD}"
cat << 'BANNER'
  _           _  __            _    _ _
 | |__ _  _  | |/ /  _ _ _ ___| |_ (_) |_____
 | '_ \ || | | ' < || | '_/ _ \ ' \| | / / _ \
 |_.__/\_, | |_|\_\_,_|_| \___/_||_|_|_\_\___/
       |__/
BANNER
printf "%b\n\n" "${NC}"

# ---------------------------------------------------------------------------
# 1. Bahasa
# ---------------------------------------------------------------------------
echo "Choose language / Pilih bahasa:"
echo "  [1] Bahasa Indonesia"
echo "  [2] English"
read -rp "> " lang_choice < /dev/tty
LANG_CODE="en"
[ "$lang_choice" = "1" ] && LANG_CODE="id"

# Pesan dua-bahasa lewat 1 fungsi -- daripada duplikasi seluruh script jadi 2 file,
# atau nyampur ID/EN di tiap baris echo.
t() {
  case "$1" in
    ask_folder) [ "$LANG_CODE" = id ] && echo "Folder tempat install (kosongin buat default '~/apps'):" || echo "Install folder (leave empty for default '~/apps'):" ;;
    ask_domain) [ "$LANG_CODE" = id ] && echo "Domain buat Kitab Link (kosongin kalau cuma mau akses lewat IP:3000):" || echo "Domain for Kitab Link (leave empty to just use IP:3000):" ;;
    ask_www) [ "$LANG_CODE" = id ] && echo "Tambahin www.$DOMAIN juga? [Y/n]" || echo "Also add www.$DOMAIN? [Y/n]" ;;
    ask_container) [ "$LANG_CODE" = id ] && echo "Nama container (kosongin buat default 'kitab-link'):" || echo "Container name (leave empty for default 'kitab-link'):" ;;
    container_taken) [ "$LANG_CODE" = id ] && echo "Nama itu udah kepake container lain. Coba nama lain:" || echo "That name is already used by another container. Try another:" ;;
    no_docker) [ "$LANG_CODE" = id ] && echo "Docker belum terinstal. Install dulu: https://docs.docker.com/engine/install/" || echo "Docker isn't installed. Install it first: https://docs.docker.com/engine/install/" ;;
    caddy_found) [ "$LANG_CODE" = id ] && echo "Caddy yang udah jalan ketemu (container: $CADDY_NAME) -- bakal disambungin ke situ, gak bikin proxy baru." || echo "Found an existing Caddy container ($CADDY_NAME) -- will hook into it instead of creating a new proxy." ;;
    caddy_ask) [ "$LANG_CODE" = id ] && echo "Belum ada Caddy (reverse proxy) di server ini. Mau sekalian dipasang? [Y/n]" || echo "No Caddy (reverse proxy) found on this server. Set it up now? [Y/n]" ;;
    dns_mismatch) [ "$LANG_CODE" = id ] && echo "FYI: domain '$DOMAIN' resolve ke $DOMAIN_IP, bukan IP server ini ($SERVER_IP). Normal kalau kamu pakai Cloudflare/CDN proxy di depan. Kalau BUKAN dan ini gak disengaja, cek DNS-nya -- SSL cert bisa gagal kalau salah arah." || echo "FYI: domain '$DOMAIN' resolves to $DOMAIN_IP, not this server's IP ($SERVER_IP). That's normal if you're using Cloudflare/a CDN proxy. If not, double-check your DNS -- SSL cert issuance can fail if it's pointed wrong." ;;
    cloudflare_tip) [ "$LANG_CODE" = id ] && echo "Tips: kalau domain ini di belakang Cloudflare -- set ke 'DNS only' (awan abu-abu) dulu sampai cert didapat, baru balik 'Proxied'. Dan set SSL/TLS mode ke 'Full (strict)'." || echo "Tip: if this domain is behind Cloudflare -- set it to 'DNS only' (grey cloud) until the cert is issued, then switch back to 'Proxied'. Also set SSL/TLS mode to 'Full (strict)'." ;;
    waiting) [ "$LANG_CODE" = id ] && echo "Nunggu Kitab Link siap..." || echo "Waiting for Kitab Link to be ready..." ;;
    healthy) [ "$LANG_CODE" = id ] && echo "Kitab Link sehat dan jalan!" || echo "Kitab Link is healthy and running!" ;;
    done_msg) [ "$LANG_CODE" = id ] && echo "Selesai! Ambil token setup pertama kali:" || echo "Done! Grab your first-time setup token:" ;;
    visit) [ "$LANG_CODE" = id ] && echo "Lalu buka:" || echo "Then visit:" ;;
  esac
}

# ---------------------------------------------------------------------------
# 2. Prasyarat
# ---------------------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  echo "$(t no_docker)"
  exit 1
fi

# ---------------------------------------------------------------------------
# 2.5 Folder install (dipakai buat app-nya sendiri, DAN buat Caddy kalau bikin baru --
# kalau Caddy udah ada, folder-nya ya folder yang udah ada itu, gak kepengaruh ini).
# ---------------------------------------------------------------------------
echo "$(t ask_folder)"
read -rp "> " folder_input < /dev/tty
INSTALL_DIR="${folder_input:-$HOME/apps}"
mkdir -p "$INSTALL_DIR"

# ---------------------------------------------------------------------------
# 3. Domain (opsional)
# ---------------------------------------------------------------------------
echo "$(t ask_domain)"
read -rp "> " DOMAIN_RAW < /dev/tty

DOMAIN=""
ADD_WWW="n"
if [ -n "$DOMAIN_RAW" ]; then
  # Normalisasi: lowercase (domain case-insensitive, tapi Caddyfile/URL nanti kebaca
  # rapi), buang scheme, buang trailing slash, buang "www." (ditanya terpisah biar gak
  # nebak-nebak -- domain gabungan TLD kayak .my.id/.co.id gak bisa dideteksi "root vs
  # subdomain" cuma dari jumlah titik doang).
  DOMAIN=$(echo "$DOMAIN_RAW" | tr '[:upper:]' '[:lower:]' | sed -E 's#^https?://##; s#/$##; s#^www\.##')

  echo "$(t ask_www)"
  read -rp "> " www_choice < /dev/tty
  [ -z "$www_choice" ] || [ "${www_choice,,}" = "y" ] && ADD_WWW="y"

  # FYI doang, BUKAN blocker -- domain yang udah bener Cloudflare-proxied (atau CDN
  # lain) MEMANG gak akan pernah match IP origin (itu tujuan proxy-nya), jadi ngeblok
  # di sini bakal false-positive buat setup yang justru udah benar.
  SERVER_IP=$(curl -fsS -4 ifconfig.me || echo "")
  DOMAIN_IP=$(dig +short "$DOMAIN" 2>/dev/null | tail -1 || echo "")
  if [ -n "$SERVER_IP" ] && [ -n "$DOMAIN_IP" ] && [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
    warn "$(t dns_mismatch)"
  fi
fi

# ---------------------------------------------------------------------------
# 4. Nama container
# ---------------------------------------------------------------------------
CONTAINER_NAME="kitab-link"
echo "$(t ask_container)"
read -rp "> " container_input < /dev/tty
[ -n "$container_input" ] && CONTAINER_NAME="$container_input"

while docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; do
  echo "$(t container_taken)"
  read -rp "> " CONTAINER_NAME < /dev/tty
done

# ---------------------------------------------------------------------------
# 5. Deteksi Caddy yang udah jalan (atau bikin baru)
# ---------------------------------------------------------------------------
CADDY_NETWORK=""
CADDYFILE_HOST_PATH=""
CADDY_NAME=""

if [ -n "$DOMAIN" ]; then
  # SIMULATE_NO_CADDY=1 -- buat testing doang, biar bisa nge-tes jalur "belum ada Caddy"
  # di VPS yang beneran udah ada Caddy, tanpa harus stop Caddy asli (zero downtime).
  if [ "${SIMULATE_NO_CADDY:-}" != "1" ]; then
    CADDY_NAME=$(docker ps --format '{{.Names}}\t{{.Image}}' | awk -F'\t' '$2 ~ /caddy/ {print $1; exit}')
  fi

  if [ -n "$CADDY_NAME" ]; then
    info "$(t caddy_found)"
    CADDY_NETWORK=$(docker inspect "$CADDY_NAME" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' | head -1)
    CADDYFILE_HOST_PATH=$(docker inspect "$CADDY_NAME" --format '{{range .Mounts}}{{if eq .Destination "/etc/caddy/Caddyfile"}}{{.Source}}{{end}}{{end}}')
  else
    echo "$(t caddy_ask)"
    read -rp "> " caddy_confirm < /dev/tty
    if [ -z "$caddy_confirm" ] || [ "${caddy_confirm,,}" = "y" ]; then
      mkdir -p "$INSTALL_DIR"/proxy
      touch "$INSTALL_DIR"/proxy/Caddyfile
      docker network create proxy 2>/dev/null || true
      cat > "$INSTALL_DIR"/proxy/docker-compose.yml << 'EOF'
services:
  caddy:
    image: caddy:2-alpine
    container_name: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - proxy

networks:
  proxy:
    external: true

volumes:
  caddy_data:
  caddy_config:
EOF
      (cd "$INSTALL_DIR/proxy" && docker compose up -d)
      CADDY_NAME="caddy"
      CADDY_NETWORK="proxy"
      CADDYFILE_HOST_PATH="$INSTALL_DIR"/proxy/Caddyfile
    fi
  fi
fi

# ---------------------------------------------------------------------------
# 6. Compose file Kitab Link
# ---------------------------------------------------------------------------
mkdir -p "$INSTALL_DIR"/"$CONTAINER_NAME"
cd "$INSTALL_DIR"/"$CONTAINER_NAME"

if [ -n "$CADDY_NETWORK" ]; then
  cat > docker-compose.yml << EOF
services:
  $CONTAINER_NAME:
    image: ghcr.io/kurohiko-id/kitab-link-self-hosted:latest
    container_name: $CONTAINER_NAME
    volumes:
      - ${CONTAINER_NAME}-data:/app/data
    restart: unless-stopped
    networks:
      - $CADDY_NETWORK

networks:
  $CADDY_NETWORK:
    external: true

volumes:
  ${CONTAINER_NAME}-data:
EOF
else
  # Gak ada domain diisi -> gak butuh reverse proxy, publish port langsung ke host.
  cat > docker-compose.yml << EOF
services:
  $CONTAINER_NAME:
    image: ghcr.io/kurohiko-id/kitab-link-self-hosted:latest
    container_name: $CONTAINER_NAME
    ports:
      - "3000:3000"
    volumes:
      - ${CONTAINER_NAME}-data:/app/data
    restart: unless-stopped

volumes:
  ${CONTAINER_NAME}-data:
EOF
fi

docker compose up -d

info "$(t waiting)"
for _ in $(seq 1 30); do
  if [ "$(docker inspect -f '{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null)" = "healthy" ]; then
    success "$(t healthy)"
    break
  fi
  sleep 1
done

# ---------------------------------------------------------------------------
# 7. Tambahin ke Caddyfile (kalau ada domain)
# ---------------------------------------------------------------------------
if [ -n "$DOMAIN" ] && [ -n "$CADDYFILE_HOST_PATH" ]; then
  SITE_HOSTS="$DOMAIN"
  [ "$ADD_WWW" = "y" ] && SITE_HOSTS="$DOMAIN, www.$DOMAIN"

  {
    echo ""
    echo "$SITE_HOSTS {"
    echo "    reverse_proxy $CONTAINER_NAME:3000"
    echo "}"
  } >> "$CADDYFILE_HOST_PATH"

  docker exec "$CADDY_NAME" caddy validate --config /etc/caddy/Caddyfile
  docker exec "$CADDY_NAME" caddy reload --config /etc/caddy/Caddyfile
fi

# ---------------------------------------------------------------------------
# 8. Selesai
# ---------------------------------------------------------------------------
echo ""
success "$(t done_msg)"
echo "  docker logs $CONTAINER_NAME | grep \"Setup token\""
echo ""
echo "$(t visit)"
if [ -n "$DOMAIN" ]; then
  echo "  https://$DOMAIN/setup"
  echo ""
  echo "$(t cloudflare_tip)"
else
  echo "  http://$(curl -fsS -4 ifconfig.me 2>/dev/null || echo "SERVER_IP"):3000/setup"
fi
