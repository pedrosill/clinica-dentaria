# DentalPro — plano de preparação para primeira utilização clínica

Este plano define o mínimo necessário para a primeira versão desktop de uma clínica dentária. Não é uma certificação jurídica. A clínica continua responsável por validar a base legal, políticas, contratos, retenção e licenciamento com um profissional habilitado em Portugal.

## Critério de lançamento

Enquanto os itens P0 não estiverem concluídos e testados, a aplicação só deve usar dados fictícios ou dados de teste controlados. Mobile e faturação estão fora do escopo desta versão.

## P0 — bloqueadores antes de dados reais

- [x] Autorização server-side por papel e por recurso, com uma matriz explícita para administrador, receção e médico dentista.
- [x] Verificação consistente das relações paciente–consulta–nota–plano–profissional em todas as leituras e escritas abrangidas.
- [partial] Registo de auditoria append-only para acessos e alterações clínicas, consultas, pacientes, utilizadores e definições; os eventos não guardam conteúdo clínico, mas a gravação transversal ainda é assíncrona/best-effort e precisa de tratamento fail-closed ou de uma fila durável para operações sensíveis.
- [x] Processo de alteração de notas clínicas finalizadas sem sobrescrever o original (adendas versionadas).
- [ ] Backups automáticos, cifrados, com retenção configurável e teste documentado de restauro.
- [ ] Configuração de produção segura: HTTPS atrás de proxy, cookies seguros, proteção CSRF, headers, secrets fora do repositório e arranque fail-closed.
- [ ] Remoção de credenciais administrativas previsíveis. O fluxo seguro de alteração da password do utilizador autenticado está implementado e testado; a alteração inicial das credenciais de bootstrap continua pendente.
- [partial] Procedimento operacional de incidente parcialmente documentado em `docs/INCIDENT_RESPONSE.md`; owners, contactos, validação da clínica/jurídica, testes e aprovação continuam pendentes.

## P1 — controlo documental e direitos dos pacientes

- [partial] Consentimentos e metadados documentais têm finalidade/versão/data/responsável/estado; assinaturas, binários privados, expiry e versionamento documental continuam fora.
- [x] Exportação estruturada do processo de um paciente, com evento de auditoria e responsável.
- [partial] Fluxo interno para pedidos de acesso, correção, limitação e eliminação/anonymização; existe registo e estados, mas não há executor de eliminação/anonymização.
- [partial] Políticas de conservação desativadas e sem duração por defeito, holds e preview/aplicação explícita; não há prazos inventados nem apagamento automático.
- [partial] Listagens novas minimizam campos e excluem conteúdo de auditoria; a revisão global das respostas antigas continua pendente.
- [x] Administração interna permite a administradores listar/criar/ativar/desativar utilizadores (sem auto-desativação) e cada utilizador autenticado pode alterar a sua própria password; recuperação de password, alteração administrativa e revisão periódica continuam pendentes.

## P1 — documentação da clínica, fora do código

- [ ] Identificar responsável pelo tratamento, subcontratantes, alojamento, localização dos dados e transferências.
- [ ] Registo de atividades de tratamento.
- [ ] Política de privacidade e informação aos pacientes.
- [ ] Avaliação de risco/AIPD, quando aplicável, e decisão documentada sobre EPD/DPO.
- [ ] Política de acessos, backups, conservação, incidentes e formação dos colaboradores.
- [ ] Confirmação do registo/licenciamento da clínica e dos profissionais junto das entidades competentes.

## P2 — depois do núcleo seguro

- [x] Recall e fila de seguimento persistente, com datas previstas, histórico do paciente, permissões e testes de transição; notificações permanecem fora do escopo.
- [partial] Lista de espera persistente com prioridade, data/médico pretendidos, estados operacionais, permissões, histórico no paciente e auditoria; o matching automático de vagas continua fora deste incremento.
- [partial] Relatórios operacionais e exportações não clínicas: existe uma primeira página desktop de consultas, protegida por papel e escopo de médico, com filtros inclusivos de período/médico/estado, totais, linhas minimizadas e CSV local apenas das linhas visíveis; utilização, progresso de planos e outros relatórios continuam fora deste incremento.
- [ ] Notificações e preferências de comunicação.
- [ ] Faturação e pagamentos permanecem adiados para uma versão futura.

## Regra de execução

Cada alteração deve primeiro indicar qual problema resolve, por que motivo é a opção mais simples, quais são os limites e que testes provam o comportamento. Antes de criar modelos ou rotas, deve procurar-se a funcionalidade existente e atualizar `docs/FEATURE_INVENTORY.md`. Uma implementação não pode ser considerada “legal” apenas por passar testes técnicos; a conclusão depende também das decisões e documentos da clínica.
