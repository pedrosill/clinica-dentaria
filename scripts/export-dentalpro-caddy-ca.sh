#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="${DENTALPRO_PROJECT_DIR:-$HOME/dentalpro}"
COMPOSE_FILE="${DENTALPRO_COMPOSE_FILE:-docker-compose.clinic.yml}"
COMPOSE_PROJECT_NAME="${DENTALPRO_COMPOSE_PROJECT_NAME:-dentalpro-clinic}"
OUTPUT_FILE="${1:-$HOME/dentalpro-caddy-root.crt}"

if [[ "$(id -u)" -eq 0 ]]; then
  SUDO=''
else
  SUDO='sudo'
fi

cd "$PROJECT_DIR"
CONTAINER_ID="$($SUDO docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" ps -q caddy)"
if [[ -z "$CONTAINER_ID" ]]; then
  echo 'O contentor Caddy não está a correr. Inicia primeiro o perfil da clínica.' >&2
  exit 1
fi

TEMP_FILE="$(mktemp)"
trap 'rm -f "$TEMP_FILE"' EXIT
$SUDO docker cp "$CONTAINER_ID:/data/caddy/pki/authorities/local/root.crt" "$TEMP_FILE"
$SUDO chown "$(id -u):$(id -g)" "$TEMP_FILE"
install -m 0644 "$TEMP_FILE" "$OUTPUT_FILE"

echo "Certificado raiz exportado para: $OUTPUT_FILE"
echo 'Instala este certificado como Autoridade de Certificação de Raiz Fidedigna nos dois computadores clientes.'
