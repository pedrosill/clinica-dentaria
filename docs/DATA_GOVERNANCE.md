# Governança de dados — backend

Este bloco é uma fundação técnica interna; não é certificação nem define prazos legais. A clínica deve aprovar base legal, responsáveis, contratos, conservação e procedimentos com apoio habilitado.

## Disponível

- `GET /api/audit-events` e `GET /api/audit-events/:id`: apenas administrador; a listagem exclui o JSON de metadados por minimização.
- `GET/POST /api/patients/:patientId/consents` e `POST .../withdraw`: protegidos pela relação do paciente.
- `GET/POST /api/patients/:patientId/documents`: metadados e upload binário privado PDF/JPEG/PNG/DOCX até 25 MB; o conteúdo fica fora do web root, com nome opaco, hash SHA-256, permissões do sistema e download autenticado/auditado.
- `GET /api/patients/:patientId/documents/:documentId/content`: stream autenticado; nunca expõe o `storageKey`.
- `GET /api/patients/:patientId/export`: exportação estruturada, com motivo auditado e sem credenciais/sessões; não substitui resposta formal a um pedido de acesso.
- `POST/PATCH/GET /api/data-subject-requests`: criação com relação do paciente; consulta/atualização administrativa; pedidos de erasure/anonymization exigem confirmação, verificam retention holds e anonimiza os dados de contacto sem apagar automaticamente o histórico clínico que possa ter de ser conservado.
- `GET/PUT /api/retention/policies`, `GET /preview`, `POST /apply` e gestão de holds: apenas administrador.

Os `AuditEvent` são criados pelo helper central, limitam metadados a 8 KiB, omitem chaves sensíveis e têm proteção SQLite contra UPDATE/DELETE. A auditoria transversal cobre requests de autenticação, pacientes, consultas, clínica, utilizadores, definições e governação; exportação, upload/download documental, validação clínica, anonimização e aprovação da checklist exigem gravação fail-closed.

## Limites deliberados

As políticas de retenção são criadas desativadas e sem duração. `apply` exige confirmação administrativa e cria holds; a anonimização de um pedido aprovado é explícita e bloqueada por holds. Não foram inventados prazos legais. Notas clínicas finais permanecem imutáveis; correções são adendas numeradas. A cifragem do volume e a inclusão da pasta privada numa estratégia de backup continuam a ser controlos de deployment.
