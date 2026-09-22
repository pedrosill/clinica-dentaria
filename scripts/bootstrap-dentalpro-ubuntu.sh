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

if ! command -v openssl >/dev/null 2>&1; then
  $SUDO apt-get update
  $SUDO apt-get install -y openssl
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

ENV_FILE="$PROJECT_DIR/.env"
if ! grep -q '^BACKUP_ENCRYPTION_KEY=.' "$ENV_FILE"; then
  printf '\nBACKUP_ENCRYPTION_KEY=%s\n' "$(openssl rand -hex 32)" >> "$ENV_FILE"
fi
if ! grep -q '^BACKUP_ENCRYPTION_REQUIRED=' "$ENV_FILE"; then
  printf 'BACKUP_ENCRYPTION_REQUIRED=true\n' >> "$ENV_FILE"
fi

if ! grep -q '^SEED_DEVELOPMENT_DATA=' "$ENV_FILE"; then
  read -r -p 'Criar dados fictícios para teste? [s/N]: ' SEED_INPUT
  case "$SEED_INPUT" in
    [sS]|[sS][iI][mM]) SEED_VALUE='true' ;;
    *) SEED_VALUE='false' ;;
  esac
  printf 'SEED_DEVELOPMENT_DATA=%s\n' "$SEED_VALUE" >> "$ENV_FILE"
fi

if ! grep -q '^DENTALPRO_SECONDARY_BACKUP_HOST_DIR=' "$ENV_FILE"; then
  DEFAULT_SECONDARY_DIR="$PROJECT_DIR/backups-secondary"
  read -r -p "Pasta para a segunda cópia dos backups [$DEFAULT_SECONDARY_DIR]: " SECONDARY_DIR_INPUT
  SECONDARY_DIR_INPUT="${SECONDARY_DIR_INPUT:-$DEFAULT_SECONDARY_DIR}"
  if [[ "$SECONDARY_DIR_INPUT" != /* ]]; then
    echo 'A pasta da segunda cópia deve ser um caminho absoluto, por exemplo /mnt/dentalpro-backups.' >&2
    exit 1
  fi
  printf 'DENTALPRO_SECONDARY_BACKUP_HOST_DIR="%s"\n' "$SECONDARY_DIR_INPUT" >> "$ENV_FILE"
fi

SECONDARY_DIR="$(awk -F= '/^DENTALPRO_SECONDARY_BACKUP_HOST_DIR=/{value=$2; sub(/^"/, "", value); sub(/"$/, "", value); print value}' "$ENV_FILE" | tail -n 1)"
if [[ -z "$SECONDARY_DIR" || "$SECONDARY_DIR" != /* ]]; then
  echo 'DENTALPRO_SECONDARY_BACKUP_HOST_DIR não contém um caminho absoluto válido.' >&2
  exit 1
fi
$SUDO mkdir -p "$SECONDARY_DIR"
$SUDO chmod 700 "$SECONDARY_DIR"
chmod 600 "$ENV_FILE"

DOCKER_BIN="$(command -v docker)"
BACKUP_RUNNER='/usr/local/sbin/dentalpro-backup'
$SUDO tee "$BACKUP_RUNNER" >/dev/null <<EOF
#!/usr/bin/env bash
set -Eeuo pipefail
cd "$PROJECT_DIR"
exec "$DOCKER_BIN" compose -f "$PROJECT_DIR/$COMPOSE_FILE" run --rm --no-deps dentalpro sh -lc 'npm run db:backup && npm run db:backup:verify'
EOF
$SUDO chmod 755 "$BACKUP_RUNNER"

$SUDO tee /etc/systemd/system/dentalpro-backup.service >/dev/null <<EOF
[Unit]
Description=DentalPro encrypted backup and verification
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=$BACKUP_RUNNER
EOF

$SUDO tee /etc/systemd/system/dentalpro-backup.timer >/dev/null <<'EOF'
[Unit]
Description=Run DentalPro backup every day

[Timer]
OnCalendar=*-*-* 23:00:00 Europe/Lisbon
Persistent=true
RandomizedDelaySec=5m
Unit=dentalpro-backup.service

[Install]
WantedBy=timers.target
EOF

$SUDO systemctl daemon-reload
$SUDO systemctl enable --now dentalpro-backup.timer

echo 'A construir e iniciar a DentalPro com dados fictícios...'
cd "$PROJECT_DIR"
$SUDO docker compose -f "$COMPOSE_FILE" up --build -d
$SUDO docker compose -f "$COMPOSE_FILE" ps

echo ''
echo "Aplicação disponível em: ${DENTALPRO_ORIGIN_INPUT:-${DEFAULT_ORIGIN}}"
echo 'Este perfil é apenas para testes com dados fictícios; não o uses ainda com dados reais da clínica.'
