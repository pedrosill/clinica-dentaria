#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="${DENTALPRO_PROJECT_DIR:-$HOME/dentalpro}"
COMPOSE_FILE="${DENTALPRO_COMPOSE_FILE:-docker-compose.local.yml}"

if [[ "$(id -u)" -eq 0 ]]; then
  SUDO=''
else
  SUDO='sudo'
fi

if [[ ! -d "$PROJECT_DIR" ]]; then
  echo "Não encontrei o projeto em $PROJECT_DIR." >&2
  exit 1
fi

cd "$PROJECT_DIR"

echo '=== DentalPro: diagnóstico ==='
echo "Data: $(date --iso-8601=seconds)"
echo "IP(s): $(hostname -I)"
echo ''

echo '--- Contentores ---'
$SUDO docker compose -f "$COMPOSE_FILE" ps
echo ''

echo '--- Health/readiness ---'
if curl --fail --silent --show-error http://127.0.0.1:5000/health/ready >/dev/null; then
  echo 'Aplicação: OK'
else
  echo 'Aplicação: FALHOU' >&2
fi
echo ''

echo '--- Backup timer ---'
$SUDO systemctl list-timers dentalpro-backup.timer --no-pager || true
echo ''

echo '--- Últimos backups ---'
$SUDO docker compose -f "$COMPOSE_FILE" exec -T dentalpro sh -lc 'ls -lht /app/data/backups/dentalpro-* 2>/dev/null | head -n 5 || true' || true
$SUDO docker compose -f "$COMPOSE_FILE" exec -T dentalpro sh -lc 'ls -lht /app/data/backups-secondary/dentalpro-* 2>/dev/null | head -n 5 || true' || true
echo ''

echo '--- Espaço em disco ---'
df -h "$PROJECT_DIR"
