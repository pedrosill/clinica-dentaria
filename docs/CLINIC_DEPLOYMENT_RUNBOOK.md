# DentalPro - runbook de deployment da clinica

Este documento e uma checklist de operacao e aprovacao. Nao e certificacao juridica nem substitui a validacao do responsavel pelo tratamento, da direcao clinica ou de um consultor habilitado.

## Antes do primeiro dado real

- Escolher um host dedicado e preencher owner tecnico, responsavel pelo tratamento, secretaria/coordenacao de privacidade e direcao clinica.
- Para o teste com dois computadores, usar apenas dados fictícios e o perfil `docker-compose.local.yml`, com a VM em rede privada e sem port forwarding no router. Para produção, a VM deve servir a aplicação através de HTTPS atrás de um proxy controlado, com `HOST=0.0.0.0` apenas dentro da rede Docker, `CLIENT_ORIGIN` explícita, `TRUST_PROXY` limitado ao proxy e firewall a restringir a rede da clínica.
- Ativar cifragem do volume pelo sistema operativo (por exemplo BitLocker) e restringir a conta de servico.
- Definir `PRIVATE_DOCUMENTS_DIR` fora do web root, criar a diretoria com ACL restrita e confirmar que o servidor nao a publica como estatico.
- Manter a `BACKUP_ENCRYPTION_KEY` fora do Git e com permissões restritas; o bootstrap clínico cria o timer `dentalpro-clinic-backup.timer` e executa a verificação depois do backup.
- Confirmar uma segunda cópia aprovada pela clínica e definir como o owner será alertado quando o serviço falhar.
- Aplicar migrations com o servidor parado ou em janela controlada: `npm run db:migrate --prefix server`.
- Executar health/readiness checks e confirmar que o serviço responde apenas no endereço privado da VM; confirmar também que não existe acesso pelo router, que o proxy termina TLS e que os cookies Secure/SameSite estão ativos em produção.
- Criar contas individuais: administradora tecnica, doutora e secretaria; ativar MFA nas contas privilegiadas.

## Arranque do perfil clínico HTTPS

O perfil `docker-compose.clinic.yml` publica o Caddy na porta 443 e mantém o DentalPro apenas na rede Docker. O caminho recomendado para o primeiro arranque é executar na VM:

```bash
cd ~/dentalpro
sudo bash scripts/bootstrap-dentalpro-clinic.sh
```

O script instala o Docker se necessário, configura a chave de backup, cria a pasta da segunda cópia, aplica migrations e pede interativamente os dados do primeiro administrador. Se for necessário preparar manualmente, criar no `.env` da raiz pelo menos:

```env
BACKUP_ENCRYPTION_KEY=uma-chave-aleatoria-forte
DENTALPRO_SECONDARY_BACKUP_HOST_DIR=/mnt/dentalpro-backups
```

Aplicar migrations e criar o primeiro administrador de forma interativa:

```bash
sudo docker compose -p dentalpro-clinic -f docker-compose.clinic.yml run --rm --no-deps dentalpro npx prisma migrate deploy
sudo docker compose -p dentalpro-clinic -f docker-compose.clinic.yml run --rm --no-deps dentalpro npm run admin:create
sudo docker compose -p dentalpro-clinic -f docker-compose.clinic.yml up -d
```

Depois exportar a CA interna:

```bash
./scripts/export-dentalpro-caddy-ca.sh
```

Instalar o certificado exportado nos dois computadores clientes e associar `dentalpro.clinic` ao IP privado da VM nos respetivos ficheiros `hosts`. O acesso deve ser feito por `https://dentalpro.clinic`; não usar diretamente a porta 5000.

Para atualizações futuras, fazer primeiro um backup verificado e usar:

```bash
./scripts/update-dentalpro-clinic.sh
```

Para diagnóstico sem alterações:

```bash
./scripts/check-dentalpro-clinic.sh
```

## Testes de aceite

1. Login com password e MFA; revogar uma sessao e confirmar que deixa de funcionar.
2. Secretaria cria uma transcricao de papel em rascunho; a app grava identidade e data de transcricao; a secretaria nao consegue finalizar.
3. Doutora valida a nota; a nota fica final/impossivel de editar e uma adenda fica separada.
4. Upload de PDF; confirmar diretoria privada, hash, download autenticado e evento de auditoria.
5. Gerar exportacao com motivo; confirmar que nao inclui sessions, passwords ou tokens.
6. Criar pedido de acesso/correcao/erasure; registar resposta e, quando aplicavel, executar anonimização apenas com confirmacao e sem retention hold.
7. Executar backup cifrado, confirmar segunda copia e executar `db:backup:verify`.
8. Restaurar para base de teste, validar login/pacientes/agenda e guardar evidencia do RPO/RTO.

## Rollback e incidentes

- Parar o servico antes de substituir SQLite.
- Usar `npm run db:restore --prefix server -- <backup> --target <target> --replace`; conservar a copia `.pre-restore`.
- Em caso de suspeita de acesso indevido, revogar sessoes, bloquear a conta, preservar logs e seguir `docs/INCIDENT_RESPONSE.md`.
- Nao apagar a base ou documentos para “resolver” um incidente sem decisao documentada da clinica.

## Aprovacao da clinica

| Item | Nome | Data | Assinatura/aceite |
| --- | --- | --- | --- |
| Configuracao e acessos | [preencher] | [preencher] | [preencher] |
| Fluxo clinico e migracao | [preencher] | [preencher] | [preencher] |
| Backups e restauro | [preencher] | [preencher] | [preencher] |
| Privacidade, retention e incidentes | [preencher] | [preencher] | [preencher] |

Revisao: [preencher] - Proxima revisao: [preencher]
