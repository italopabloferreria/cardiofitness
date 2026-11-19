# Plano — portal nativo simples de avaliações

## Objetivo aprovado pelo RH

- RH autenticado cria e administra ciclos, colaboradores e avaliações.
- Cada ciclo tem um link de questionário para compartilhar.
- Colaboradores abrem o link sem criar conta e enviam respostas; não têm acesso ao dashboard, cadastro completo, respostas alheias ou relatórios.
- As respostas ficam persistidas no Supabase e alimentam resultados, gráficos e histórico do RH.
- Colaboradores desligados deixam de entrar em novos ciclos. O cadastro deve ser desativado quando houver histórico para preservar resultados anteriores.

## Decisão de escopo

Não implementar login, código por colaborador, portal de resultados para funcionários nem auditoria avançada nesta versão. A escolha de respondente/pessoa avaliada pode ser simples, semelhante ao formulário atual; eventuais seleções equivocadas não bloqueiam a operação. A API pública continua restrita a receber uma submissão validada: nenhuma rota pública pode ler avaliações, respostas, relatórios ou dados administrativos.

## Caminho técnico

1. Reaproveitar o ciclo, o mapeamento de perguntas e as tabelas de resultados existentes quando possível.
2. Fazer `/avaliar` carregar somente o contexto mínimo de um ciclo publicado (modalidades, perguntas e opções necessárias) e renderizar o questionário nativo.
3. Persistir a submissão no servidor/Supabase, validando ciclo aberto, modalidade, IDs de perguntas, escala 1–4 e campos obrigatórios. Não devolver o resultado ou dados do RH à pessoa que respondeu.
4. Manter RLS/RH existentes; não conceder `SELECT` público em tabelas de respostas/colaboradores nem expor chave `service_role`. Usar mecanismo de escrita restrito, auditável e idempotente.
5. Integrar respostas aos resultados e gráficos já usados pelo RH, preservando o histórico e prevenindo duplicação por envio repetido.
6. Manter o fluxo legado de sincronização como contingência até o teste real de ponta a ponta e a conciliação do histórico.
7. Desativar colaboradores desligados para excluí-los de próximos ciclos sem apagar avaliações anteriores.

## Verificação para considerar pronto

- Link público abre somente a avaliação ativa e aceita uma submissão válida sem conta.
- Link público não consegue ler respostas, relatórios, cadastros administrativos ou alterar ciclo.
- Uma resposta aparece no Supabase e nos resultados/gráficos do RH; respostas repetidas não duplicam a mesma submissão.
- O RH consegue criar ciclo/formulário, compartilhar link, acompanhar respostas e desativar pessoa preservando o histórico.
- `npm run typecheck`, `npm test`, `npm run build` e revisão funcional em navegador.
- Um teste de gravação usa projeto/ambiente controlado ou resposta fictícia previamente autorizada; não criar dados de teste em produção sem confirmação.

## Bloqueadores de infraestrutura

- Confirmar mecanismo server-side de escrita restrita no projeto Cardiofitness, sem permissões anônimas amplas.
- Configurar segredos de produção fora do código e publicar a versão após testes.
- Reconciliar o ciclo de Outubro e corrigir o ciclo atual antes de afirmar que o dashboard está computando todos os dados.
