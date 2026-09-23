#!/usr/bin/env bash
set -Eeuo pipefail

# Configura a camada de firewall do Ubuntu para o host DentalPro.
# A reserva DHCP do IP e as regras do router continuam a ser configuradas manualmente.

if [[ "$(id -u)" -eq 0 ]]; then
  SUDO=''
else
  SUDO='sudo'
fi

if [[ ! -f /etc/os-release ]] || ! grep -qi 'ubuntu' /etc/os-release; then
  echo 'Este script requer Ubuntu Server.' >&2
  exit 1
fi

LAN_CIDR="${DENTALPRO_LAN_CIDR:-}"
SSH_CIDR="${DENTALPRO_SSH_CIDR:-}"

if [[ -z "$LAN_CIDR" ]]; then
  read -r -p 'CIDR da rede interna da clínica (ex.: 192.168.68.0/24): ' LAN_CIDR
fi
if [[ ! "$LAN_CIDR" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}/([0-9]|[12][0-9]|3[0-2])$ ]]; then
  echo "CIDR inválido: $LAN_CIDR" >&2
  exit 1
fi

if [[ -z "$SSH_CIDR" ]]; then
  read -r -p "CIDR autorizado para administração SSH [$LAN_CIDR]: " SSH_CIDR
  SSH_CIDR="${SSH_CIDR:-$LAN_CIDR}"
fi
if [[ ! "$SSH_CIDR" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}/([0-9]|[12][0-9]|3[0-2])$ ]]; then
  echo "CIDR SSH inválido: $SSH_CIDR" >&2
  exit 1
fi

echo ''
echo 'Serão aplicadas estas regras:'
echo "- negar novas ligações de entrada por defeito"
echo "- permitir HTTPS (443/tcp) de $LAN_CIDR"
echo "- permitir SSH (22/tcp) de $SSH_CIDR"
echo "- não publicar a porta 5000"
echo ''
read -r -p 'Escreve APLICAR para confirmar: ' CONFIRMATION
if [[ "$CONFIRMATION" != 'APLICAR' ]]; then
  echo 'Operação cancelada.'
  exit 0
fi

if ! command -v ufw >/dev/null 2>&1; then
  $SUDO apt-get update
  $SUDO apt-get install -y ufw
fi

$SUDO ufw default deny incoming
$SUDO ufw default allow outgoing
$SUDO ufw allow from "$LAN_CIDR" to any port 443 proto tcp comment 'DentalPro HTTPS interno'
$SUDO ufw allow from "$SSH_CIDR" to any port 22 proto tcp comment 'Administracao SSH DentalPro'
$SUDO ufw delete allow 5000/tcp >/dev/null 2>&1 || true
$SUDO ufw --force enable

echo ''
$SUDO ufw status verbose
echo ''
echo 'Firewall configurado. Confirma também que não existe port forwarding no router.'
echo 'O Docker publica apenas a porta 443 no perfil clínico; testa o acesso a partir de um computador fora da rede autorizada.'
