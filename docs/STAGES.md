# DentalPro — fases de melhoria da conformidade

Este documento orienta a evolução da secção de conformidade. A checklist é um controlo operacional da clínica; não é uma certificação legal. A clínica deve validar as decisões jurídicas, clínicas e documentais aplicáveis.

## Fase 1 — checklist clara e utilizável

- [x] Simplificar descrições, procedimentos e evidências para leitura rápida.
- [x] Separar claramente verificações automáticas de tarefas manuais.
- [x] Permitir indicar o responsável real e a data da próxima revisão.
- [x] Reformular o item de HTTPS para o cenário local: acesso ao computador, firewall e exposição à rede.
- [x] Criar item explícito para fornecedores, subcontratantes, localização dos dados e transferências.
- [x] Manter a aprovação auditada e impedir que sinais automáticos sejam apresentados como aprovação legal.

Critério de conclusão: cada item deve explicar em poucas linhas o que falta, quem trata do assunto e que referência deve ser guardada.

## Fase 2 — evidências e documentação

- [ ] Permitir associar uma evidência a um documento privado já carregado.
- [ ] Exportar a checklist preenchida para PDF.
- [ ] Incluir estado, responsável, data de revisão, aprovador e riscos em aberto na exportação.
- [ ] Criar modelos curtos para registo de atividades, incidentes, conservação, acessos e deployment.

Critério de conclusão: a clínica consegue guardar e entregar um pacote documental coerente sem copiar informação manualmente entre sistemas.

## Fase 3 — controlos técnicos operacionais

- [ ] Documentar e testar o arranque local, permissões do sistema operativo e firewall.
- [ ] Configurar cifragem do volume de produção no computador da clínica.
- [ ] Agendar backups cifrados da base e dos documentos, com cópia externa.
- [ ] Executar e registar um teste de restauro fora da produção.
- [ ] Confirmar rotação de credenciais iniciais, MFA, recuperação segura e revogação de sessões.

Critério de conclusão: existe prova operacional recente, não apenas configuração no código.

## Fase 4 — privacidade e resposta a pedidos

- [ ] Preencher o registo de atividades de tratamento da clínica e, se aplicável, o registo de subcontratante.
- [ ] Registar a decisão sobre AIPD e necessidade de EPD/DPO.
- [ ] Formalizar informação de privacidade, base jurídica, conservação e canais de contacto.
- [ ] Testar o fluxo de acesso, correção, limitação e eliminação, incluindo verificação de identidade e prazos.
- [ ] Definir incidentes, responsáveis, contenção, avaliação e eventual notificação.

Critério de conclusão: cada processo tem responsável, prazo, evidência e decisão aprovada pela clínica.

## Fase 5 — aprovação de entrada em produção

- [ ] Rever todos os itens P0 e P1 com a responsável da clínica e a responsável clínica.
- [ ] Registar riscos aceites, responsáveis e data de revisão.
- [ ] Guardar a aprovação final do deployment.
- [ ] Repetir a revisão após alterações materiais na aplicação, equipa, fornecedor ou infraestrutura.

## Fora do alcance automático da aplicação

A app pode guardar evidências, estados, responsáveis, aprovações e auditoria. Não pode determinar sozinha a base jurídica, os prazos de conservação, a necessidade de AIPD/EPD, o licenciamento da clínica ou se um procedimento é juridicamente suficiente.
