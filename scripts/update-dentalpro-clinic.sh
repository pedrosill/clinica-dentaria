#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
export DENTALPRO_COMPOSE_FILE='docker-compose.clinic.yml'
export DENTALPRO_COMPOSE_PROJECT_NAME='dentalpro-clinic'

exec bash "$SCRIPT_DIR/update-dentalpro-ubuntu.sh" "$@"
