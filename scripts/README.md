# Scripts de operação

Os scripts devem ser executados no ambiente indicado. Não se deve executar um script de instalação numa VM já usada sem confirmar primeiro o seu objetivo.

## Preparação da VM no Windows

`setup-dentalpro-vm.ps1` corre no PowerShell do Windows anfitrião. Instala o Ubuntu Server na VM, configura a rede bridge e inicia o instalador do sistema operativo. A criação do utilizador e a instalação do Ubuntu continuam a ser interativas.

## Bootstrap do Ubuntu

`bootstrap-dentalpro-ubuntu.sh` corre dentro do Ubuntu. Instala Docker, clona o branch configurado, prepara backups cifrados e inicia o perfil `docker-compose.local.yml`. Esse perfil é para testes/pilotos controlados; não é ainda a configuração final de produção.

Numa instalação nova, o bootstrap pergunta pela palavra-passe inicial do administrador. A palavra-passe não aparece no ecrã, não deve ser colocada no Git e deve ser alterada novamente depois do primeiro acesso. Também pergunta se devem ser criados dados fictícios; numa clínica responde-se `N`.

## Atualização segura

`update-dentalpro-ubuntu.sh` corre dentro do Ubuntu e:

1. recusa atualizar com alterações locais não guardadas;
2. valida a configuração Compose;
3. cria e verifica um backup antes da atualização;
4. atualiza o branch configurado;
5. reconstrói e reinicia os contentores;
6. preserva os volumes de dados.

Nunca usar `docker compose down -v` numa instalação com dados.

Para atualizar o perfil clínico HTTPS, usa as mesmas salvaguardas com a configuração explícita:

```bash
DENTALPRO_COMPOSE_FILE=docker-compose.clinic.yml DENTALPRO_COMPOSE_PROJECT_NAME=dentalpro-clinic ./scripts/update-dentalpro-ubuntu.sh
```

## Diagnóstico

`check-dentalpro-ubuntu.sh` é apenas de leitura. Mostra IPs, contentores, health check, timer de backups, últimas cópias e espaço em disco.

Para diagnosticar o perfil clínico:

```bash
DENTALPRO_COMPOSE_FILE=docker-compose.clinic.yml DENTALPRO_COMPOSE_PROJECT_NAME=dentalpro-clinic DENTALPRO_BACKUP_TIMER=dentalpro-clinic-backup.timer ./scripts/check-dentalpro-ubuntu.sh
```

## Perfil clínico com HTTPS interno

`bootstrap-dentalpro-clinic.sh` prepara uma instalação clínica limpa: instala Docker se necessário, atualiza o `master`, configura backups cifrados, constrói a imagem de produção, aplica migrations, pede o administrador inicial e inicia o perfil HTTPS.

`docker-compose.clinic.yml` usa o Caddy como proxy HTTPS interno. O Caddy é o único serviço publicado na rede da clínica; o DentalPro fica acessível apenas dentro da rede Docker. Depois de iniciar o perfil clínico, `export-dentalpro-caddy-ca.sh` exporta o certificado raiz que deve ser instalado nos dois computadores clientes.

Em cada computador Windows cliente, executar o PowerShell como administrador e usar `setup-dentalpro-client.ps1`. O script instala o certificado raiz, atualiza o `hosts`, limpa o DNS e testa o HTTPS:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\setup-dentalpro-client.ps1 -VmIp 192.168.68.61 -CertificatePath "$env:USERPROFILE\Desktop\dentalpro-caddy-root.crt" -OpenBrowser
```

O script mostra a impressão digital do certificado e exige a confirmação `CONFIRMO`; esta confirmação é intencional porque altera as autoridades de confiança do Windows.

## PDF de conformidade

`build_clinic_compliance_pdf.py` gera o documento de conformidade e não faz parte do arranque ou manutenção da aplicação.
