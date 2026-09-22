#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="${DENTALPRO_PROJECT_DIR:-$HOME/dentalpro}"
BRANCH="${DENTALPRO_BRANCH:-master}"
COMPOSE_FILE="${DENTALPRO_COMPOSE_FILE:-docker-compose.local.yml}"

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

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Existem alterações locais em $PROJECT_DIR. Resolve-as antes de atualizar." >&2
  exit 1
fi

if ! $SUDO docker compose -f "$COMPOSE_FILE" config >/dev/null; then
  echo "A configuração Docker Compose não é válida." >&2
  exit 1
fi

echo 'A criar e verificar um backup antes da atualização...'
$SUDO docker compose -f "$COMPOSE_FILE" run --rm --no-deps dentalpro sh -lc 'npm run db:backup && npm run db:backup:verify'

echo "A atualizar o branch $BRANCH..."
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo 'A reconstruir e reiniciar a aplicação...'
$SUDO docker compose -f "$COMPOSE_FILE" up --build -d
$SUDO docker compose -f "$COMPOSE_FILE" ps

echo 'Atualização concluída. O volume de dados não foi removido.'
