# Cardiofitness 2.0 — arquitetura de avaliações nativas (proposta, fase 1)

> **ESTADO:** planejamento e protótipo visual em branch separada. Nenhum banco alterado, nenhuma resposta importada ou novo formulário ativado. Os Google Forms históricos permanecem operacionais e intocados.

## Objetivo: um link permanente

O RH publica **uma única URL curta** da Cardiofitness, terminada em \`/avaliar\`, sem IDs de campanha, setor ou pessoa na URL. Exemplos de formato apenas: \`https://SEU-DOMINIO/avaliar\`. A URL não está ativada nesta fase.

1. A pessoa abre o mesmo link a qualquer momento.
2. Antes de revelar dados, informa um **código individual forte** fornecido pelo RH (ou, no futuro, outra forma de identidade previamente autorizada). **Nome/CPF/telefone isolados não autenticam.**
3. O backend valida o código, a expiração e as tentativas, cria sessão curta e resolve o funcionário do cadastro institucional.
4. O backend consulta a campanha ativa no fuso **America/Sao_Paulo**, encontra as atribuições permitidas e mostra somente as perguntas correspondentes.
5. A pessoa preenche o questionário; o backend valida cada nota, elegibilidade, versão do modelo e duplicidade. Confirma **somente após persistência**.
6. Se não houver campanha ativa para ela, mostra «Nenhuma avaliação disponível neste momento». A URL continua a mesma.

O link não fica estranho. A navegação **não inclui CPF, nome, ID de funcionário, código secreto ou token em parâmetros públicos**. Não usar Google Forms para novas respostas depois do lançamento nativo.

## Fronteiras de acesso

- **Público \`/avaliar\`:** identifica e permite registrar apenas as próprias atribuições. O código é aleatório de alta entropia, armazenado **somente como hash** no banco, com uso único ou sessão limitada, expiração e limite de tentativas/IP. Não criar «login por selecionar o nome».
- **RH \`/\`:** conta autorizada existente com \`requireRh\`, RLS, exportações, relatórios e auditoria.
- **Liderança:** acesso restrito à sua equipe e às atribuições de avaliação, não a todos os relatórios e respostas de outros setores.
- **Respostas identificadas:** não exibir feedback individual para outras pessoas fora da política autorizada do RH. Somente HTTPS, no-store, proteção CSRF/origem e limitação de volume.
- **Sem segredos no navegador** e sem \`service_role\` em rotas públicas. Toda autorização de atribuição é feita no servidor, nunca apenas em listas do cliente.

## Modelo de dados futuro (proposta, ainda não migrada)

Reutilizar \`employees\`, \`cycles\`, \`cycle_participants\`, \`evaluations\` e \`evaluation_responses\` atuais para relatórios históricos; **não apagar, renomear ou converter essas tabelas de imediato**.

Criar, em migração separada a ser aprovada e testada:

| Tabela proposta | Finalidade |
| --- | --- |
| \`native_templates\` | Modelo, título, modalidade: \`leadership\`, \`leader_to_employee\`, \`team\`, \`self\` |
| \`native_template_versions\` | Versão imutável das perguntas, critérios e escala 1–4 |
| \`native_schedules\` | Regra mensal ou bimestral, mês âncora, data de início e política de abertura |
| \`native_campaigns\` | Janela, estado \`draft/open/closed\`, versão do modelo, snapshot e prazo |
| \`native_assignments\` | Ciclo + respondente + pessoa avaliada; única por combinação, vínculo congelado |
| \`native_access_codes\` | Hash de código aleatório, expiração, tentativas, uso, revogação |
| \`native_submissions\` | Uma resposta por atribuição, notas validadas, observações e carimbo do envio |
| \`native_audit_events\` | Abertura/encerramento, reenvios, alterações feitas pelo RH, acesso administrativo |
| \`legacy_import_tracking\` | Origem + ID único do Google Forms + status, para migração idempotente |

Aplicar constraints para chave estrangeira, unicidade de atribuição e envio; indexar campanha/respondente/assunto; RLS \`default deny\` para novas tabelas. Evitar respostas de colaboradores em log público. Adotar controle de versão imutável quando a campanha abrir, com participantes, setor e líder congelados para preservar comparações históricas.

## Ciclos automáticos

- O RH define uma política por modalidade: **mensal** (funcionário avalia líder), **bimestral** (entre colegas), e demais modalidades conforme aprovação.
- A regra possui uma **âncora aprovada** para evitar deslocar arbitrariamente o calendário. A função pura \`src/lib/native/campaign.ts\` calcula períodos e atribuições sem escrita.
- Um processo agendado idempotente abre e fecha campanhas conforme calendário em horário de Brasília, usando controle transacional e chave única. O cron **não** pode sobrescrever ciclos que já têm respostas.
- O RH pode pausar, cancelar ou postergar antes da abertura; exceções registradas na auditoria.
- Nova admissão entra somente em campanha futura, salvo inclusão formal de RH antes da abertura. Desligamentos ficam fora de novas atribuições, mas mantêm o histórico.
- Funcionário → líder: somente seu líder ativo no snapshot. Líder → funcionário: somente seus subordinados. Colegas: pessoas ativas do mesmo setor, excluindo autoavaliação; autoavaliação tem modalidade própria.
- Respostas duplicadas: bloqueadas por índice único no banco, inclusive em cliques simultâneos.

## Portas e API planejadas

| Rota | Acesso | Finalidade |
| --- | --- | --- |
| \`/avaliar\` | Público com verificação de código | Única entrada permanente |
| \`/api/native/access\` | Público, limitado | Troca código por sessão curta, sem expor cadastro |
| \`/api/native/assignments\` | Sessão de colaborador | Lista somente as suas atribuições ativas |
| \`/api/native/submissions\` | Sessão de colaborador | Grava resposta elegível, idempotente |
| \`/api/rh/native/schedules\` | RH | Regras de calendário e modelos |
| \`/api/rh/native/campaigns\` | RH | Preparação, pausa e encerramento |
| \`/api/internal/native/cycle-runner\` | Cron autenticado | Abertura/encerramento idempotentes |

Estas rotas de API **não estão implementadas** na fase 1. O dashboard atual continua funcionando sem dependência delas.

## Interface entregue nesta etapa

- \`/preview/avaliar\`: fluxo responsivo de identificação, simulação de colaborador/líder, notas de 1–4 e confirmação **sem persistência**.
- \`/preview/rh\`: prévia visual do dashboard simplificado, modelos, equipes, calendário, indicadores e uma criação de ciclo **simulada em memória**.
- Os exemplos usam apenas nomes fictícios. A navegação não consulta nem altera o Supabase.
- As duas prévias são intencionalmente separadas de \`/\` e do futuro \`/avaliar\` para não confundir usuários com formulários ainda inativos.

## Migração e ativação seguras

1. Obter acesso de leitura autenticada **ao projeto Supabase da Cardiofitness**. A verificação de 18/11 confirmou somente o endpoint Auth e que `anon` é bloqueado; ainda falta consultar o banco como RH autorizado. Não usar Thayná/Entrelinhas/Seidler/ICB-AI por engano.
2. Realizar **somente leitura** do banco institucional, inventário de tabelas, campanhas e respostas. Identificar o ciclo de novembro de 2026 e comparar com o Google Forms antes de mudar qualquer coisa.
3. Criar migração **aditiva**, validada em ambiente de testes isolado. Não apagar dados de novembro e não editar tabela histórica com migração destrutiva.
4. Criar APIs com testes de acesso não autorizado, replay, duplicidade, expiração de código, limite de tentativas e proteção de dados.
5. Migrar respostas antigas com chave \`(google_form_id, google_response_id)\` única, preservar origem, data e versão do questionário, verificar totais e reconciliar inconsistências.
6. Homologar RH + líderes + colaboradores em prévia, com pessoas e respostas de teste, sem misturar dados fictícios com produção.
7. Ativar \`/avaliar\` **somente após validação de identidade e persistência**. Desativar coleta antiga do Google Forms depois da conciliação e comunicação com RH, sem excluir os formulários históricos.

## Estado e próximos passos

- **Feito:** arquitetura, funções puras de planejamento e atribuições, testes, prévias responsivas.
- **Pendente:** banco correto, tabelas novas, autorização, API, cron, persistência de respostas, exportação integrada, migração de histórico, release.
- **Nunca presumir:** que o link novo já funciona, que respostas já estão sendo contabilizadas ou que o Supabase institucional foi conectado sem inspeção.

## Verificação de segurança do portal público — 18/11/2026

- A API pública de contexto e a rota de envio existiam como scaffolding, mas o contexto usava fallback fixo de ciclo/colaboradores e o envio retornava sucesso mesmo quando o Supabase falhava.
- O teste local de conectividade alcançou Auth do projeto (HTTP 200); uma leitura anônima de `employees` foi recusada com `42501`, consistente com os privilégios/RLS restritivos. Isso não comprova estado nem persistência do banco como RH autorizado.
- Corrigido para falhar fechado fora de `APP_DEMO_MODE=true`: contexto indisponível sem fallback de pessoas/ciclo e envio HTTP 503 sem gravar em arquivo local ou tentar gravar anonimamente no Supabase. O modo de demonstração usa somente fixtures locais; respostas locais órfãs, fora dos IDs fictícios das fixtures, não entram no dashboard demo.
- **Não executar** `supabase/migrations/20261118_public_evaluation_portal.sql` nem `supabase/ativar-portal-e-sincronizar-supabase.sql`: a migration concede leitura anônima de colaboradores/ciclos/avaliações e inserções sem vínculo verificado; o script também libera SELECT amplo das respostas e altera cadastros/ciclo. Nenhum SQL remoto foi aplicado.
- Até implementar e homologar código individual forte (hash), sessão curta, atribuições verificadas no servidor, rate limit e políticas RLS, Google Forms continua sendo o coletor legado; o portal nativo não está recebendo respostas.

### Recomendação de URL

Depois que o domínio oficial for confirmado, usar \`https://DOMINIO-OFICIAL/avaliar\`. Sem novo link a cada ciclo. Até a ativação, distribuir somente o formulário existente do Google para a campanha atual, se validado pelo RH.

## Auditoria operacional do ciclo Outubro — 18/11/2026

- Consulta **somente leitura** no projeto correto `cadiofit@gmail.com` confirmou o ciclo oficial `Outubro - 2026` (08–20/10), com 2 avaliações e 117 respostas no cache (117 IDs de origem distintos): 22/28 em liderança e 95/182 em equipe. As duas avaliações foram consultadas por último em 22/10; a tentativa registrada mais recente é de 28/10.
- A sincronização automática não volta a consultar ciclos encerrados há mais de sete dias. Outubro requer sincronização manual autenticada pelo RH nas duas avaliações, pela rota existente `/api/evaluations/{id}/sync`; validar importadas/rejeitadas após cada execução. Nenhuma sincronização foi executada nesta revisão.
- A consulta encontrou ainda o ciclo conhecido de teste `88d6a7d2-184f-4313-80b3-cbb8ff30317f`, com 1 avaliação e 1 resposta. Nenhum registro foi excluído, renomeado ou movido para a lixeira; obter confirmação imediatamente antes de qualquer exclusão permanente.
- O painel de produção aberto na mesma conta RH ainda mostra Novembro selecionado com 1 participante, sem totais esperados e zero respostas. A atualização local corrige indicadores que alegavam conclusão sem uma sincronização verificável, mas não foi publicada.

## Isolamento das demonstrações — 18/11/2026

- Auditoria encontrou que `src/lib/demo.ts` usava anteriormente `OFFICIAL_STAFF`, `OFFICIAL_LEADERS`, os IDs dos Google Forms oficiais e perguntas reais. Substituído localmente por pessoas/IDs fictícios, endereços `example.invalid`, perguntas de demonstração e respostas determinísticas isoladas. O modo demo continua exigindo `APP_DEMO_MODE=true` e a produção fixa `false`.
- Adicionada regressão para garantir que o dataset de demonstração não reutiliza IDs/nomes oficiais ou URLs dos formulários oficiais. A prévia `/preview/avaliar` usa somente estado local do navegador; `/avaliar` continua bloqueado para persistência real.
