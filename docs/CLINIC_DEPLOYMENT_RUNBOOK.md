# DentalPro - runbook de deployment da clinica

Este documento e uma checklist de operacao e aprovacao. Nao e certificacao juridica nem substitui a validacao do responsavel pelo tratamento, da direcao clinica ou de um consultor habilitado.

## Antes do primeiro dado real

- Escolher um host dedicado e preencher owner tecnico, responsavel pelo tratamento, secretaria/coordenacao de privacidade e direcao clinica.
- Para a instalação local da clínica, confirmar `NODE_ENV=production`, `LOCAL_ONLY=true`, `HOST=127.0.0.1`, `CLIENT_ORIGIN` em `http://localhost`/`http://127.0.0.1` e `TRUST_PROXY` vazio. Se a app for aberta a outros dispositivos, usar o perfil HTTPS atrás de proxy e preencher `TRUST_PROXY`.
- Ativar cifragem do volume pelo sistema operativo (por exemplo BitLocker) e restringir a conta de servico.
- Definir `PRIVATE_DOCUMENTS_DIR` fora do web root, criar a diretoria com ACL restrita e confirmar que o servidor nao a publica como estatico.
- Configurar `BACKUP_ENCRYPTION_KEY_FILE`, `BACKUP_SECONDARY_DIR`, `BACKUP_STATUS_FILE` e um scheduler do sistema operativo.
- Agendar `npm run db:backup --prefix server` e `npm run db:backup:verify --prefix server`; definir alerta ao owner quando falhar.
- Aplicar migrations com o servidor parado ou em janela controlada: `npm run db:migrate --prefix server`.
- Executar health/readiness checks e confirmar que o serviço só responde em `127.0.0.1`; no perfil HTTPS, confirmar também cookies Secure/SameSite e a terminação TLS.
- Criar contas individuais: administradora tecnica, doutora e secretaria; ativar MFA nas contas privilegiadas.

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
