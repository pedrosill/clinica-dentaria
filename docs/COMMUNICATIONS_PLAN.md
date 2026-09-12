# Comunicações com pacientes

O sistema já guarda `phone` e `email` obrigatórios no processo do paciente. Não é necessário criar um segundo campo para o mesmo contacto. A validação do servidor aceita números com espaços, hífens ou prefixo internacional e garante um email com formato utilizável.

## O que ainda não está ativo

Não são enviados emails, WhatsApp ou SMS automaticamente. Isto é intencional: antes de contactar pacientes é necessário decidir a base legal/consentimento, o texto aprovado pela clínica, o fornecedor, o responsável pelas credenciais e a retenção dos registos de entrega.

## Opção recomendada para a primeira integração

1. Criar preferências por paciente: canal permitido (`email`, `whatsapp`, `sms`, `none`), lembretes autorizados e data da autorização.
2. Criar uma fila de mensagens (outbox) com evento, paciente, consulta, template, estado, tentativas e uma chave idempotente. Nunca enviar diretamente dentro do pedido de criação da consulta.
3. Apresentar uma pré-visualização ao pessoal da clínica para confirmações manuais durante o piloto.
4. Integrar email através de um fornecedor transacional com TLS e contrato adequado. Para WhatsApp, usar a WhatsApp Business Platform através de um fornecedor aprovado; mensagens iniciadas pela clínica normalmente exigem templates aprovados e regras próprias do canal.
5. Guardar apenas metadados de entrega e o mínimo de conteúdo necessário. Mensagens devem conter data, hora, local e contacto da clínica, nunca diagnóstico, plano de tratamento ou outros dados clínicos.
6. Implementar retries limitados, backoff, idempotência, opt-out imediato, caixa de falhas e auditoria administrativa antes de ativar o envio automático.

## Ordem segura

O próximo incremento deve ser preferências + outbox + pré-visualização. A ligação a um fornecedor real deve ficar atrás de configuração explícita de produção e só ser ativada depois de a clínica aprovar o fornecedor, custos, textos e procedimento para pedidos de oposição.
