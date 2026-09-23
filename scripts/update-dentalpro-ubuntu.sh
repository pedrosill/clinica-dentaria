#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="${DENTALPRO_PROJECT_DIR:-$HOME/dentalpro}"
BRANCH="${DENTALPRO_BRANCH:-master}"
COMPOSE_FILE="${DENTALPRO_COMPOSE_FILE:-docker-compose.local.yml}"
COMPOSE_PROJECT_NAME="${DENTALPRO_COMPOSE_PROJECT_NAME:-}"

if [[ "$(id -u)" -eq 0 ]]; then
  SUDO=''
else
  SUDO='sudo'
fi

if [[ ! -d "$PROJECT_DIR/.git" ]]; then
  echo "Não encontrei um checkout DentalPro em $PROJECT_DIR." >&2
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

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Existem alterações locais em $PROJECT_DIR. Resolve-as antes de atualizar." >&2
  exit 1
fi

if ! compose config >/dev/null; then
  echo "A configuração Docker Compose não é válida." >&2
  exit 1
fi

echo 'A criar e verificar um backup antes da atualização...'
compose run --rm --no-deps dentalpro sh -lc 'npm run db:backup && npm run db:backup:verify'

echo "A atualizar o branch $BRANCH..."
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo 'A reconstruir e reiniciar a aplicação...'
compose up --build -d
compose ps

echo 'Atualização concluída. O volume de dados não foi removido.'
