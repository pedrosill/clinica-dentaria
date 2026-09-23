#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="${DENTALPRO_PROJECT_DIR:-$HOME/dentalpro}"
COMPOSE_FILE="${DENTALPRO_COMPOSE_FILE:-docker-compose.local.yml}"
COMPOSE_PROJECT_NAME="${DENTALPRO_COMPOSE_PROJECT_NAME:-}"
BACKUP_TIMER="${DENTALPRO_BACKUP_TIMER:-dentalpro-backup.timer}"

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

compose() {
  if [[ -n "$COMPOSE_PROJECT_NAME" ]]; then
    $SUDO docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" "$@"
  else
    $SUDO docker compose -f "$COMPOSE_FILE" "$@"
  fi
}

echo '=== DentalPro: diagnóstico ==='
echo "Data: $(date --iso-8601=seconds)"
echo "IP(s): $(hostname -I)"
echo ''

echo '--- Contentores ---'
compose ps
echo ''

echo '--- Health/readiness ---'
if compose exec -T dentalpro node -e "fetch('http://127.0.0.1:5000/health/ready').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"; then
  echo 'Aplicação: OK'
else
  echo 'Aplicação: FALHOU' >&2
fi
echo ''

echo '--- Backup timer ---'
$SUDO systemctl list-timers "$BACKUP_TIMER" --no-pager || true
echo ''

echo '--- Últimos backups ---'
compose exec -T dentalpro sh -lc 'ls -lht /app/data/backups/dentalpro-* 2>/dev/null | head -n 5 || true' || true
compose exec -T dentalpro sh -lc 'ls -lht /app/data/backups-secondary/dentalpro-* 2>/dev/null | head -n 5 || true' || true
echo ''

echo '--- Espaço em disco ---'
df -h "$PROJECT_DIR"
