#!/usr/bin/env bash
set -Eeuo pipefail

REPO_URL="${DENTALPRO_REPO_URL:-https://github.com/pedrosill/clinica-dentaria.git}"
BRANCH="${DENTALPRO_BRANCH:-master}"
PROJECT_DIR="${DENTALPRO_PROJECT_DIR:-$HOME/dentalpro}"
COMPOSE_FILE="docker-compose.local.yml"

if [[ "$(id -u)" -eq 0 ]]; then
  SUDO=''
else
  SUDO='sudo'
fi

if [[ ! -f /etc/os-release ]] || ! grep -qi 'ubuntu' /etc/os-release; then
  echo 'Este script requer Ubuntu Server.' >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  $SUDO apt-get update
  $SUDO apt-get install -y git ca-certificates curl
fi

if ! command -v docker >/dev/null 2>&1 || ! $SUDO docker compose version >/dev/null 2>&1; then
  echo 'A instalar Docker Engine e o plugin Compose...'
  $SUDO apt-get update
  $SUDO apt-get install -y ca-certificates curl
  $SUDO install -m 0755 -d /etc/apt/keyrings
  $SUDO curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  $SUDO chmod a+r /etc/apt/keyrings/docker.asc
  source /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${UBUNTU_CODENAME:-$VERSION_CODENAME} stable" | $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null
  $SUDO apt-get update
  $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  $SUDO systemctl enable --now docker
fi

if [[ -d "$PROJECT_DIR/.git" ]]; then
  echo "A atualizar o projeto em $PROJECT_DIR..."
  if [[ -n "$(git -C "$PROJECT_DIR" status --porcelain)" ]]; then
    echo "O projeto tem alterações locais em $PROJECT_DIR. Resolve-as antes de executar novamente." >&2
    exit 1
  fi
  git -C "$PROJECT_DIR" fetch origin "$BRANCH"
  git -C "$PROJECT_DIR" checkout "$BRANCH"
  git -C "$PROJECT_DIR" pull --ff-only origin "$BRANCH"
else
  echo "A clonar o projeto para $PROJECT_DIR..."
  git clone --branch "$BRANCH" "$REPO_URL" "$PROJECT_DIR"
fi

if [[ ! -f "$PROJECT_DIR/$COMPOSE_FILE" ]]; then
  echo "Não encontrei $COMPOSE_FILE em $PROJECT_DIR." >&2
  exit 1
fi

VM_IP="$(hostname -I | awk '{print $1}')"
DEFAULT_ORIGIN="http://${VM_IP}:5000"
if [[ -f "$PROJECT_DIR/.env" ]]; then
  echo "A manter o .env existente em $PROJECT_DIR/.env"
else
  read -r -p "Endereço da aplicação [$DEFAULT_ORIGIN]: " DENTALPRO_ORIGIN_INPUT
  DENTALPRO_ORIGIN_INPUT="${DENTALPRO_ORIGIN_INPUT:-$DEFAULT_ORIGIN}"
  printf 'DENTALPRO_ORIGIN=%s\nDENTALPRO_PORT=5000\n' "$DENTALPRO_ORIGIN_INPUT" > "$PROJECT_DIR/.env"
  chmod 600 "$PROJECT_DIR/.env"
fi

echo 'A construir e iniciar a DentalPro com dados fictícios...'
cd "$PROJECT_DIR"
$SUDO docker compose -f "$COMPOSE_FILE" up --build -d
$SUDO docker compose -f "$COMPOSE_FILE" ps

echo ''
echo "Aplicação disponível em: ${DENTALPRO_ORIGIN_INPUT:-${DEFAULT_ORIGIN}}"
echo 'Este perfil é apenas para testes com dados fictícios; não o uses ainda com dados reais da clínica.'
