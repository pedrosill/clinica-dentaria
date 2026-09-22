# Scripts de operação

Os scripts devem ser executados no ambiente indicado. Não se deve executar um script de instalação numa VM já usada sem confirmar primeiro o seu objetivo.

## Preparação da VM no Windows

`setup-dentalpro-vm.ps1` corre no PowerShell do Windows anfitrião. Instala o Ubuntu Server na VM, configura a rede bridge e inicia o instalador do sistema operativo. A criação do utilizador e a instalação do Ubuntu continuam a ser interativas.

## Bootstrap do Ubuntu

`bootstrap-dentalpro-ubuntu.sh` corre dentro do Ubuntu. Instala Docker, clona o branch configurado, prepara backups cifrados e inicia o perfil `docker-compose.local.yml`. Esse perfil é para testes/pilotos controlados; não é ainda a configuração final de produção.

## Atualização segura

`update-dentalpro-ubuntu.sh` corre dentro do Ubuntu e:

1. recusa atualizar com alterações locais não guardadas;
2. valida a configuração Compose;
3. cria e verifica um backup antes da atualização;
4. atualiza o branch configurado;
5. reconstrói e reinicia os contentores;
6. preserva os volumes de dados.

Nunca usar `docker compose down -v` numa instalação com dados.

## Diagnóstico

`check-dentalpro-ubuntu.sh` é apenas de leitura. Mostra IPs, contentores, health check, timer de backups, últimas cópias e espaço em disco.

## PDF de conformidade

`build_clinic_compliance_pdf.py` gera o documento de conformidade e não faz parte do arranque ou manutenção da aplicação.
