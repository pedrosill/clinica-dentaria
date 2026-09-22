#!/usr/bin/env bash
set -Eeuo pipefail

# Instala o perfil clínico: produção local, Caddy HTTPS interno e base de dados limpa.
# A criação do primeiro administrador é interativa e nunca guarda a palavra-passe no script.

REPO_URL="${DENTALPRO_REPO_URL:-https://github.com/pedrosill/clinica-dentaria.git}"
BRANCH="${DENTALPRO_BRANCH:-master}"
PROJECT_DIR="${DENTALPRO_PROJECT_DIR:-$HOME/dentalpro}"
COMPOSE_FILE="docker-compose.clinic.yml"
HOSTNAME_VALUE="dentalpro.clinic"

if [[ "$(id -u)" -eq 0 ]]; then
  SUDO=''
else
  SUDO='sudo'
fi

if [[ ! -f /etc/os-release ]] || ! grep -qi 'ubuntu' /etc/os-release; then
  echo 'Este script requer Ubuntu Server.' >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1 || ! command -v openssl >/dev/null 2>&1; then
  $SUDO apt-get update
  $SUDO apt-get install -y ca-certificates curl git openssl
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
  if [[ -n "$(git -C "$PROJECT_DIR" status --porcelain)" ]]; then
    echo "O projeto tem alterações locais em $PROJECT_DIR. Resolve-as antes de executar novamente." >&2
    exit 1
  fi
  git -C "$PROJECT_DIR" fetch origin "$BRANCH"
  git -C "$PROJECT_DIR" checkout "$BRANCH"
  git -C "$PROJECT_DIR" pull --ff-only origin "$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$PROJECT_DIR"
fi

if [[ ! -f "$PROJECT_DIR/$COMPOSE_FILE" ]]; then
  echo "Não encontrei $COMPOSE_FILE em $PROJECT_DIR." >&2
  exit 1
fi

ENV_FILE="$PROJECT_DIR/.env"
if [[ -f "$ENV_FILE" ]]; then
  echo "A manter o .env existente em $ENV_FILE"
else
  touch "$ENV_FILE"
fi

append_if_missing() {
  local name="$1"
  local value="$2"
  if ! grep -q "^${name}=" "$ENV_FILE"; then
    printf '%s=%s\n' "$name" "$value" >> "$ENV_FILE"
  fi
}

if ! grep -q '^BACKUP_ENCRYPTION_KEY=.' "$ENV_FILE"; then
  append_if_missing BACKUP_ENCRYPTION_KEY "$(openssl rand -hex 32)"
fi
append_if_missing BACKUP_RETENTION_COUNT 14

if ! grep -q '^DENTALPRO_SECONDARY_BACKUP_HOST_DIR=' "$ENV_FILE"; then
  SECONDARY_DIR="${DENTALPRO_SECONDARY_BACKUP_HOST_DIR:-/mnt/dentalpro-backups}"
  if [[ "$SECONDARY_DIR" != /* ]]; then
    echo 'DENTALPRO_SECONDARY_BACKUP_HOST_DIR deve ser um caminho absoluto.' >&2
    exit 1
  fi
  printf 'DENTALPRO_SECONDARY_BACKUP_HOST_DIR="%s"\n' "$SECONDARY_DIR" >> "$ENV_FILE"
else
  SECONDARY_DIR="$(awk -F= '/^DENTALPRO_SECONDARY_BACKUP_HOST_DIR=/{value=$2; sub(/^"/, "", value); sub(/"$/, "", value); print value}' "$ENV_FILE" | tail -n 1)"
fi

if [[ -z "$SECONDARY_DIR" || "$SECONDARY_DIR" != /* ]]; then
  echo 'DENTALPRO_SECONDARY_BACKUP_HOST_DIR não contém um caminho absoluto válido.' >&2
  exit 1
fi
$SUDO mkdir -p "$SECONDARY_DIR"
$SUDO chmod 700 "$SECONDARY_DIR"
chmod 600 "$ENV_FILE"

cd "$PROJECT_DIR"
$SUDO docker compose -f "$COMPOSE_FILE" config >/dev/null
$SUDO docker compose -f "$COMPOSE_FILE" build
$SUDO docker compose -f "$COMPOSE_FILE" run --rm --no-deps dentalpro npx prisma migrate deploy

read -r -p 'Criar o administrador inicial agora? [S/n]: ' CREATE_ADMIN
case "$CREATE_ADMIN" in
  [nN]|[nN][aA][oO]) ;;
  *) $SUDO docker compose -f "$COMPOSE_FILE" run --rm --no-deps dentalpro npm run admin:create ;;
esac

$SUDO docker compose -f "$COMPOSE_FILE" up -d

echo 'A aguardar o Caddy iniciar e gerar a autoridade certificadora interna...'
for _ in {1..30}; do
  if $SUDO docker compose -f "$COMPOSE_FILE" ps -q caddy | grep -q .; then
    break
  fi
  sleep 2
done

"$PROJECT_DIR/scripts/export-dentalpro-caddy-ca.sh" "$PROJECT_DIR/dentalpro-caddy-root.crt"
$SUDO docker compose -f "$COMPOSE_FILE" ps

VM_IP="$(hostname -I | awk '{print $1}')"
echo ''
echo "Instalação clínica concluída."
echo "VM: $VM_IP"
echo "Acesso: https://$HOSTNAME_VALUE"
echo "Certificado para os clientes: $PROJECT_DIR/dentalpro-caddy-root.crt"
echo 'Ainda falta instalar este certificado e uma entrada hosts nos dois computadores da clínica.'
