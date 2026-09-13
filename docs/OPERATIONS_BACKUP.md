# Operação de backups SQLite

Este procedimento cobre a cópia local da base SQLite; não pressupõe AWS, Azure, Google Cloud ou outro fornecedor.

## Configuração

No ambiente do servidor, definir:

```env
DATABASE_URL="file:./dev.db"
BACKUP_DIR="./backups"
BACKUP_RETENTION_COUNT=7
BACKUP_ENCRYPTION_KEY_FILE="C:/segredos/dentalpro-backup.key"
BACKUP_SECONDARY_DIR="D:/dentalpro-backups"
BACKUP_STATUS_FILE="D:/dentalpro-backups/backup-status.json"
```

Em produção, `BACKUP_ENCRYPTION_KEY` ou `BACKUP_ENCRYPTION_KEY_FILE` é obrigatório. A chave deve ser gerida fora do repositório, com permissões restritas, e não deve ser colocada em `server/.env` se existir um gestor de segredos local disponível. Os ficheiros de backup não devem ser sincronizados ou enviados para um serviço externo sem uma decisão da clínica sobre fornecedor, localização, acesso e retenção.

## Execução e retenção

Agendar `npm run db:backup --prefix server` numa conta com acesso apenas à base e às pastas de backup. O script usa o online backup API do SQLite, verifica `integrity_check` e `foreign_key_check`, escreve com permissões restritas, pode copiar o ficheiro cifrado para `BACKUP_SECONDARY_DIR`, e grava um estado em `BACKUP_STATUS_FILE`. Elimina apenas ficheiros que correspondam ao seu próprio padrão, mantendo os `BACKUP_RETENTION_COUNT` mais recentes. Agendar também `npm run db:backup:verify --prefix server` para falhar quando o ultimo backup cifrado está ausente, demasiado antigo, não pode ser desencriptado/verificado ou a cópia secundária não corresponde ao conteúdo primário. A verificação usa a chave configurada e valida cada cópia com `integrity_check` e `foreign_key_check` antes de as comparar.

Esta rotina cria cópias locais; não é uma estratégia completa contra avaria ou perda do computador. A clínica deve configurar uma segunda cópia cifrada num local/host separado, com acesso limitado, e documentar quem verifica diariamente o resultado. Não se deve ativar sincronização automática para um serviço externo antes de aprovar fornecedor, localização dos dados, subcontratação e retenção.

Um exemplo de política mínima é uma cópia diária durante sete dias, com cópia externa aprovada e alerta diário ao owner. A clínica deve ajustar frequência e retenção à necessidade operacional e às obrigações aplicáveis; retenção técnica não substitui a política documental da clínica. A pasta privada de documentos deve estar num volume cifrado e ser incluída numa rotina de backup cifrada aprovada; o script SQLite não copia binários.

## Restauro verificado

1. Parar o servidor e confirmar que nenhum processo mantém a base aberta. Os comandos seguintes assumem execução a partir da raiz do repositório.
2. Escolher uma cópia e, primeiro, restaurá-la para uma base de teste:

   ```bash
   npm run db:restore --prefix server -- server/backups/dentalpro-...db.enc --target file:./restore-check.db
   ```

3. Confirmar no resultado que a verificação de integridade e chaves estrangeiras passou. Arrancar uma instância de teste apontada para `restore-check.db` e validar login, leitura de pacientes, agenda e uma operação não destrutiva.
4. Para substituir a base de produção, repetir com o destino de produção e `--replace`. O script cria uma cópia `.pre-restore-*.db` antes da substituição.
5. Registar data, ficheiro, operador, motivo, resultado dos testes e decisão de manter ou remover a cópia de segurança anterior. A cópia `.pre-restore-*.db` é criada com permissões restritas e deve ser tratada como dado clínico até ser eliminada segundo a política aprovada.

O restauro deve ser ensaiado pelo menos trimestralmente e depois de qualquer alteração operacional relevante. Um backup que nunca foi restaurado com sucesso não deve ser considerado comprovado.
