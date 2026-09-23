#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
export DENTALPRO_COMPOSE_FILE='docker-compose.clinic.yml'
export DENTALPRO_COMPOSE_PROJECT_NAME='dentalpro-clinic'
export DENTALPRO_BACKUP_TIMER='dentalpro-clinic-backup.timer'

exec bash "$SCRIPT_DIR/check-dentalpro-ubuntu.sh" "$@"
