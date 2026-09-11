# Governança de dados — backend

Este bloco é uma fundação técnica interna; não é certificação nem define prazos legais. A clínica deve aprovar base legal, responsáveis, contratos, conservação e procedimentos com apoio habilitado.

## Disponível

- `GET /api/audit-events` e `GET /api/audit-events/:id`: apenas administrador; a listagem exclui o JSON de metadados por minimização.
- `GET/POST /api/patients/:patientId/consents` e `POST .../withdraw`: protegidos pela relação do paciente.
- `GET/POST /api/patients/:patientId/documents`: apenas metadados; aceita PDF/JPEG/PNG/DOCX até 25 MB. Não existe armazenamento binário configurado.
- `GET /api/patients/:patientId/export`: exportação estruturada, auditada e sem credenciais/sessões.
- `POST/PATCH/GET /api/data-subject-requests`: criação com relação do paciente; consulta/atualização administrativa.
- `GET/PUT /api/retention/policies`, `GET /preview`, `POST /apply` e gestão de holds: apenas administrador.

Os `AuditEvent` são criados pelo helper central, limitam metadados a 8 KiB, omitem chaves sensíveis e têm proteção SQLite contra UPDATE/DELETE. A auditoria transversal cobre requests de autenticação, pacientes, consultas, clínica, utilizadores, definições e governação, mas a gravação transversal ainda é assíncrona/best-effort; operações sensíveis devem ganhar garantia fail-closed ou fila durável antes da utilização clínica real.

## Limites deliberados

As políticas de retenção são criadas desativadas e sem duração. `apply` exige confirmação administrativa e apenas cria holds; não apaga nem anonimiza dados automaticamente. Não foram inventados prazos legais. Documentos não têm upload/download porque o repositório não tinha uma base de armazenamento privado seguro. Notas clínicas finais permanecem imutáveis; correções são adendas numeradas.
