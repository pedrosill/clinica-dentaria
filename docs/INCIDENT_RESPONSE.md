# Runbook de resposta a incidentes

Runbook operacional para a clínica dentária. Aplica-se a suspeitas de indisponibilidade, acesso indevido, perda, alteração ou divulgação de informação, incluindo dados de saúde. Não substitui a avaliação do responsável pelo tratamento, contratos com subcontratantes ou aconselhamento jurídico.

## Antes de usar dados reais — checklist

- [ ] Preencher os owners e contactos no fim deste documento; definir suplente e canal de emergência.
- [ ] Confirmar quem é o responsável pelo tratamento, eventual EPD/DPO, subcontratantes e apoio técnico.
- [ ] Confirmar backups cifrados, localização, acessos, retenção e um restauro testado; ver `docs/OPERATIONS_BACKUP.md`.
- [ ] Confirmar contas individuais, MFA quando disponível, permissões mínimas e procedimento para revogar acessos.
- [ ] Confirmar onde ficam os logs e registos de auditoria, quem os pode consultar e a retenção aprovada.
- [ ] Fazer um exercício com dados fictícios e guardar o resultado.
- [ ] Validar com a clínica e assessoria jurídica a política de conservação, comunicação e notificação.

## 1. Deteção e abertura

Qualquer colaborador que observe comportamento anómalo, perda de equipamento, email suspeito, acesso estranho, dados incorretos ou indisponibilidade deve comunicar imediatamente ao owner técnico e ao responsável da clínica. Não apagar, corrigir ou investigar além do necessário para segurança imediata.

Registar um identificador, data/hora e fuso, pessoa que detetou, sintomas, sistemas/pessoas afetados e ações já tomadas. Tratar inicialmente como incidente até triagem concluir o contrário.

## 2. Contenção

### Responsabilidade técnica

- Preservar o serviço e os dados sem ampliar o impacto: bloquear sessão/conta comprometida, revogar tokens, isolar equipamento ou limitar acesso.
- Corrigir regras de rede, credenciais ou configuração apenas com registo da alteração.
- Se houver risco de destruição ou exfiltração, parar o componente afetado de forma controlada e preservar uma cópia forense quando possível.

### Responsabilidade da clínica

- Decidir a suspensão temporária de operações e o uso de procedimentos manuais.
- Confirmar quais colaboradores, fornecedores ou autoridades devem ser envolvidos.
- Não contactar pacientes, imprensa ou autoridades em nome da clínica antes da decisão do responsável pelo tratamento, salvo orientação jurídica ou obrigação aplicável.

## 3. Evidência e auditoria

Preservar logs de aplicação, servidor, autenticação, firewall, backups, emails relevantes e dispositivos envolvidos. Manter o original em modo só-leitura quando possível; trabalhar em cópias. Registar quem recolheu, quando, de onde, hash se aplicável, transferências e localização.

Não alterar nem eliminar eventos de auditoria. Evitar incluir dados clínicos desnecessários em tickets ou mensagens. Manter uma linha temporal factual, com hipóteses claramente marcadas como hipóteses.

## 4. Avaliação do impacto

Em conjunto, técnico e clínica devem determinar:

- que dados foram acedidos, perdidos, alterados ou destruídos (identificação, contacto, saúde, pagamentos, credenciais, etc.);
- de quantas pessoas e registos se trata, período, origem, destino e se houve acesso efetivo ou apenas exposição;
- se os dados estavam cifrados, quais as cópias e sistemas afetados e que riscos existem para os titulares;
- se há impacto na continuidade clínica, integridade de notas/agendamentos ou obrigações contratuais.

Conservar a avaliação e as incertezas. A clínica decide a classificação e o risco jurídico; a equipa técnica fornece factos, evidência e limitações.

## 5. Recuperação

Erradicar a causa, rodar credenciais/secrets afetados, aplicar correções e restaurar apenas de cópia verificada. Validar integridade da base, auditoria, permissões, login, agenda e operações clínicas não destrutivas antes de reabrir o serviço. A clínica aprova o regresso à operação e confirma qualquer reconciliação feita em papel ou sistema alternativo.

## 6. Comunicação interna

Usar o canal de incidente definido nos contactos. Comunicar apenas o necessário, sem especulação nem dados clínicos em claro. A atualização deve indicar estado, impacto conhecido/desconhecido, instruções imediatas, owner e próxima decisão. A clínica designa um único porta-voz.

## 7. Decisão de notificação

O responsável pelo tratamento, com o EPD/DPO quando exista e validação jurídica, decide se há notificação à CNPD e/ou comunicação aos titulares, documentando também a decisão de não notificar. Consultar o [artigo 33.º e 34.º do RGPD no EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/pt) e a orientação da [CNPD sobre violações de dados](https://www.cnpd.pt/organizacoes/outras-obrigacoes/violacao-de-dados-ou-data-breach/). Não assumir prazos ou limiares fora dessas fontes e da análise jurídica; se a decisão exigir atuação urgente, escalar imediatamente. Subcontratantes devem seguir o contrato e comunicar a ocorrência à clínica sem demora.

## 8. Pós-incidente

No encerramento, a clínica e o owner técnico devem registar causa provável/confirmada, linha temporal, dados afetados, decisões, notificações, custos, controlos que falharam e ações corretivas com owner e data-alvo. Rever acessos, backups, logging, formação e este runbook; testar as alterações e guardar o relatório final com acesso restrito.

## Contactos e owners — preencher pela clínica

| Função | Nome/equipa | Telefone | Email | Suplente |
|---|---|---|---|---|
| Responsável pelo tratamento / decisão | [preencher] | [preencher] | [preencher] | [preencher] |
| Owner técnico / fornecedor de suporte | [preencher] | [preencher] | [preencher] | [preencher] |
| EPD/DPO ou consultor de privacidade | [preencher/não aplicável] | [preencher] | [preencher] | [preencher] |
| Direção clínica | [preencher] | [preencher] | [preencher] | [preencher] |
| Porta-voz | [preencher] | [preencher] | [preencher] | [preencher] |
| Contacto de emergência do alojamento/fornecedor | [preencher] | [preencher] | [preencher] | [preencher] |
| Canal interno de incidente | [preencher] | [preencher] | [preencher] | [preencher] |

Última revisão: [preencher] · Próxima revisão: [preencher] · Aprovado por: [preencher]
