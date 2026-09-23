# Comunicações com pacientes

O sistema já guarda `phone` e `email` obrigatórios no processo do paciente. Não é necessário criar um segundo campo para o mesmo contacto. A validação do servidor aceita números com espaços, hífens ou prefixo internacional e garante um email com formato utilizável.

## Aviso geral de privacidade

O paciente pode receber um formulário geral de privacidade por email, em PDF pré-preenchido com os seus dados. A clínica também pode descarregar o mesmo PDF para entrega em papel. O email contém uma ligação individual, com validade limitada, onde o paciente pode confirmar que tomou conhecimento ou comunicar uma oposição; ambas as respostas ficam registadas com a versão do aviso, data/hora e email utilizado.

Este fluxo regista entrega e resposta ao aviso. Não transforma automaticamente o silêncio ou a receção do email num consentimento opcional. Consentimentos que exijam manifestação explícita continuam a ser tratados separadamente. O texto do aviso e a versão devem ser aprovados pela clínica antes da utilização em produção.

## O que ainda não está ativo

Não são enviados emails automáticos de confirmação ou lembrete de consultas. O envio manual do aviso de privacidade só fica disponível quando o SMTP, o endereço remetente, a URL pública e o texto aprovado estão configurados.

## Opção recomendada para a primeira integração

1. Criar preferências por paciente: canal permitido (`email`, `whatsapp`, `sms`, `none`), lembretes autorizados e data da autorização.
2. Criar uma fila de mensagens (outbox) com evento, paciente, consulta, template, estado, tentativas e uma chave idempotente. Nunca enviar diretamente dentro do pedido de criação da consulta.
3. Apresentar uma pré-visualização ao pessoal da clínica para confirmações manuais durante o piloto.
4. Integrar email através de um fornecedor transacional com TLS e contrato adequado. Para WhatsApp, usar a WhatsApp Business Platform através de um fornecedor aprovado; mensagens iniciadas pela clínica normalmente exigem templates aprovados e regras próprias do canal.
5. Guardar apenas metadados de entrega e o mínimo de conteúdo necessário. Mensagens devem conter data, hora, local e contacto da clínica, nunca diagnóstico, plano de tratamento ou outros dados clínicos.
6. Implementar retries limitados, backoff, idempotência, opt-out imediato, caixa de falhas e auditoria administrativa antes de ativar o envio automático.

## Ordem segura

O próximo incremento de comunicações operacionais deve ser preferências + outbox + pré-visualização. A ligação a um fornecedor real deve ficar atrás de configuração explícita de produção e só ser ativada depois de a clínica aprovar o fornecedor, custos, textos e procedimento para pedidos de oposição.
