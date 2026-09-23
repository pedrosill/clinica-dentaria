# Guião de instalação da DentalPro na clínica

Este guião descreve a primeira instalação no computador Windows mais forte da clínica, que funcionará como anfitrião da VM Ubuntu. O computador da receção será um cliente da aplicação.

Durante a primeira instalação usar apenas dados fictícios. A passagem a dados reais só acontece depois dos testes, da configuração de segurança e da aprovação da clínica.

## Cenário

- **Servidor:** computador do consultório, Windows 10 Pro, ligado à rede da clínica por Ethernet.
- **VM:** Ubuntu Server sem ambiente gráfico, a executar Docker, DentalPro e Caddy.
- **Cliente 1:** computador do consultório/servidor, se também for usado para trabalhar na aplicação.
- **Cliente 2:** computador da receção.
- **Endereço interno:** `https://dentalpro.clinic`.
- **Dados:** fictícios durante o piloto.

## 1. Preparar o computador anfitrião Windows

No computador que vai alojar a VM:

1. Confirmar que a virtualização está ativa na BIOS/UEFI.
2. Instalar VirtualBox.
3. Confirmar que o computador está ligado à rede da clínica.
4. Desativar suspensão automática quando estiver ligado à corrente.
5. Garantir espaço livre suficiente no disco.

No projeto, atualizar o código:

```powershell
cd "C:\Users\Casa\Documents\Projectos\New-Clinic\clinica-dentaria"
git pull --ff-only origin master
```

Criar a VM. Para um anfitrião com 8 GB de RAM, usar cerca de 3 GB para a VM:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\setup-dentalpro-vm.ps1 -VmName DentalPro-Clinic -MemoryMb 3072
```

Quando o script pedir o adaptador de rede, escolher o adaptador físico Ethernet/Wi-Fi. Não escolher `VirtualBox Host-Only`.

## 2. Instalar o Ubuntu Server

Durante o instalador do Ubuntu:

1. Escolher instalação normal ou minimizada, sem ambiente gráfico.
2. Usar o disco inteiro da VM.
3. Criar um utilizador administrativo próprio.
4. Ativar `OpenSSH Server` quando for sugerido.
5. Concluir a instalação e reiniciar.
6. Remover o ISO da VM depois do primeiro arranque.

Entrar na VM e descobrir o IP:

```bash
hostname -I
```

Guardar o IP temporariamente. O IP final deverá ser reservado no router através de DHCP reservation.

## 3. Instalar o perfil clínico

A partir do PowerShell do computador anfitrião, copiar o bootstrap para a VM:

```powershell
scp .\scripts\bootstrap-dentalpro-clinic.sh utilizador@IP_DA_VM:/home/utilizador/
```

Na VM:

```bash
chmod +x ~/bootstrap-dentalpro-clinic.sh
sudo bash ~/bootstrap-dentalpro-clinic.sh
```

O bootstrap irá:

- instalar Git, Docker e Compose se necessário;
- clonar o `master` para `~/dentalpro`;
- criar uma base de dados limpa;
- aplicar as migrations;
- criar a conta administrativa inicial;
- iniciar DentalPro em modo produção;
- iniciar Caddy com HTTPS interno;
- criar o timer diário de backups cifrados;
- exportar o certificado raiz para os clientes.

Quando perguntar se deve criar o administrador, responder `S` numa base nova. Usar uma palavra-passe forte com pelo menos 12 caracteres.

O bootstrap não cria dados fictícios no perfil clínico.

## 4. Configurar o firewall da VM

Depois de saber a subnet da clínica, por exemplo `192.168.68.0/24`, executar na VM:

```bash
cd ~/dentalpro
sudo bash scripts/configure-dentalpro-firewall.sh
```

Quando solicitado:

- indicar a subnet da clínica;
- indicar a subnet autorizada para SSH;
- escrever `APLICAR`.

O perfil clínico publica apenas HTTPS na porta 443. A porta 5000 não deve ser usada pelos clientes.

Confirmar também que o router não tem port forwarding para a VM.

## 5. Reservar o IP da VM

No router da clínica, criar uma reserva DHCP para o endereço MAC da VM. A reserva deve manter o mesmo IP depois de reinícios.

Este passo é manual porque varia entre routers. Depois da reserva, confirmar na VM:

```bash
hostname -I
```

Se o IP mudar, atualizar os computadores clientes.

## 6. Configurar o anfitrião Windows

No computador Windows que aloja a VM, abrir PowerShell como administrador, na pasta do projeto:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\configure-dentalpro-host.ps1 -VmName DentalPro-Clinic -ConfigurePower
```

Escrever `APLICAR` para confirmar a alteração de energia.

O script cria uma tarefa para iniciar a VM em modo headless quando o utilizador Windows inicia sessão. Para um arranque totalmente autónomo, o Windows anfitrião também terá de iniciar sessão automaticamente segundo a política da clínica.

## 7. Configurar cada computador Windows cliente

Copiar para cada computador:

- `scripts/setup-dentalpro-client.ps1`;
- `dentalpro-caddy-root.crt`, exportado pela VM.

Abrir PowerShell como administrador e executar:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup-dentalpro-client.ps1 `
  -VmIp IP_DA_VM `
  -CertificatePath "$env:USERPROFILE\Desktop\dentalpro-caddy-root.crt" `
  -OpenBrowser
```

O script instala o certificado raiz, atualiza o ficheiro `hosts`, limpa o DNS e testa o endpoint HTTPS. A confirmação `CONFIRMO` é obrigatória porque instala uma nova autoridade de confiança no Windows.

Executar este processo no computador da receção e no computador do consultório, se ambos forem usados para aceder à aplicação.

## 8. Testes de aceitação do piloto

Na VM:

```bash
cd ~/dentalpro
sudo docker compose -p dentalpro-clinic -f docker-compose.clinic.yml ps
sudo systemctl status dentalpro-clinic-backup.timer --no-pager
sudo systemctl start dentalpro-clinic-backup.service
sudo journalctl -u dentalpro-clinic-backup.service -n 50 --no-pager
```

Confirmar `Backup verification passed`.

Nos dois computadores Windows:

1. Abrir `https://dentalpro.clinic`.
2. Entrar com a conta administrativa.
3. Criar um paciente fictício.
4. Criar, reagendar e concluir uma consulta fictícia.
5. Testar o registo clínico, odontograma e anexos fictícios.
6. Confirmar que a aplicação funciona nos dois computadores ao mesmo tempo.
7. Reiniciar o Windows anfitrião e confirmar que a VM volta a arrancar.
8. Confirmar que a aplicação volta a responder depois do reinício.

## 9. Atualizações futuras

Na VM:

```bash
cd ~/dentalpro
./scripts/update-dentalpro-clinic.sh
```

O script cria e verifica um backup antes de atualizar. Para diagnóstico:

```bash
./scripts/check-dentalpro-clinic.sh
```

Nunca usar `docker compose down -v` numa instalação com dados.

## 10. Condições antes de dados reais

Não iniciar a migração de pacientes reais enquanto não estiverem confirmados:

- IP estável da VM;
- firewall e ausência de port forwarding;
- cifragem do disco/VM;
- backup externo aprovado, separado do disco principal;
- backup dos documentos privados, incluindo fotos e raios-X;
- teste de restauro documentado;
- contas individuais da doutora e da secretária;
- MFA nas contas privilegiadas;
- permissões e auditoria testadas;
- aprovação dos procedimentos pela clínica.
