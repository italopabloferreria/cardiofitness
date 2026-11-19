# Continuidade para a próxima IA — Portal de Avaliações Cardiofitness

> **Atualização de 2026-11-19:** este documento contém histórico de handoffs anteriores e há afirmações abaixo que ficaram desatualizadas após a implementação local `d3680a2`. Para o estado corrente, restrições e plano de execução, a fonte autoritativa é `../CODEX_START.md`, em conjunto com `../AGENTS.md`. Migration e produção seguem sem aplicação/validação confirmada.

> **Leia antes de mexer no projeto.** Este arquivo é uma passagem de bastão, não uma afirmação de que o portal está pronto ou publicado. Confirme o estado real do Git, do Supabase e da Vercel no momento em que retomar.

## Pedido confirmado pelo usuário

O RH cria um ciclo; as pessoas recebem/abrem um link público e respondem sem conta; as respostas ficam persistidas; o RH vê pendências, resultados, gráficos e evolução entre ciclos no painel autenticado. O RH pode desativar pessoas desligadas, mantendo as respostas históricas. É um fluxo simples, semelhante a um formulário web. Não criar acesso de funcionário, códigos, confirmação de identidade ou outro mecanismo de autenticação para respondentes. O usuário aceita que alguém possa escolher o nome errado.

Manter acesso ao dashboard e aos dados exclusivamente para RH autorizado. Google Forms pode continuar como sync/contingência dos ciclos legados durante a transição, mas não deve ser apresentado como a interface de coleta nativa. Outubro e o ciclo corrente de novembro devem ser preservados. O usuário já autorizou remover registros claramente identificados como testes; **nenhuma exclusão remota foi feita por esta implementação**.

## Instruções obrigatórias ao retomar

1. Leia `AGENTS.md` (raiz), `docs/ARQUITETURA_PORTAL_NATIVO.md`, `docs/PLANO_PORTAL_NATIVO_SIMPLES.md` e este arquivo.
2. Siga a instrução do `AGENTS.md` para consultar o Vault canônico e a nota do projeto. Não sobrescreva arquivos/notas existentes.
3. Leia o skill Supabase e os guias locais da versão instalada do Next.js antes de alterar essas partes.
4. Examine `git status` e `git diff` primeiro. Há várias alterações locais anteriores e atuais, algumas não iniciadas nesta passagem. Não descarte nem reverta alterações indiscriminadamente.
5. Não use `service_role` no browser nem conceda leitura anônima às tabelas de RH/respostas. Não aplique scripts SQL antigos sem auditoria.

## Estado conhecido desta passagem

### Alterações locais em andamento

- Criado `src/components/public-evaluation-form.tsx`: UI pública, seleção de avaliação/respondente/pessoa avaliada, notas 1–4, observação e confirmação.
- `src/app/avaliar/page.tsx` passa a renderizar o formulário; `/avaliacao-da-equipe` e `/avaliacao-de-lideres` redirecionam para `/avaliar`.
- `src/lib/use-public-form.ts` carrega contexto público e envia somente os campos necessários.
- Rotas públicas usam RPCs do Supabase (`get_public_evaluation_context`, `submit_public_native_evaluation`); demo continua usando fixtures fictícias/local storage.
- Criado `src/lib/native/evaluation-mapping.ts` para mapear perguntas por tipo/setor; templates em `src/lib/native/templates.ts`.
- Adicionada uma modal de criação de avaliação nativa nas configurações e tratamento de coleta nativa no painel/pendências.
- Criado `supabase/schemas/10_native_public_forms.sql` com coluna `source_type`, contexto público mínimo e RPC restrita de envio. Revisar, testar e gerar migration apropriada antes de aplicar.
- `src/lib/server/validation.ts` preserva o contrato antigo da RPC de sync; a comparação de configuração para edição fica separada.
- Os testes foram ajustados após a primeira execução. **Ainda não houve nova execução completa depois dos últimos patches.**

### Última verificação observada (2026-11-19)

- `npm run typecheck`: passou.
- `npm test`: passou — **34 arquivos e 223 testes**, incluindo teste PGlite da RPC/contexto público.
- `npm run build`: passou no Next.js 16.4.6.
- Abri `/avaliar` local em modo demo (`APP_DEMO_MODE=true`, porta 3001) e confirmei que o formulário e as opções são exibidos. Não enviei uma resposta para evitar gravar no armazenamento local e não fiz teste E2E contra Supabase.
- Aplicação da migration ao projeto real, persistência real, visualização pós-login e deploy ainda não foram verificados nesta passagem.
- Não houve gravação/exclusão de dados no Supabase, nem publicação.

## Trabalho pendente — ordem recomendada

### 1. Completar o caminho do RH até a coleta

- Testar a modal “Nova avaliação nativa”, confirmar cálculo de `expectedResponses`, salvar em modo demo e em Supabase local/teste.
- Simplificar a criação de ciclo: ao criar/preparar ciclo, RH deve conseguir gerar avaliações nativas padrão sem precisar configurar links Google. Revisar `src/lib/cycle-template.ts`, `src/lib/quick-cycle.ts`, `src/app/api/cycles/prepare/route.ts`, `supabase/schemas/08_prepare_cycle.sql` e a UI de Configurações.
- Para o ciclo corrente de novembro, só habilitar avaliação nativa se IDs/configuração forem confirmados e sem sobrescrever avaliações/respostas antigas. Se houver respostas legadas, manter ciclo/avaliações legadas intactas e criar avaliação nativa separada; não trocar origem com respostas.
- Exibir uma forma clara de copiar/compartilhar o link `/avaliar` e explicar que RH não compartilha login. Link público deve mostrar apenas avaliações nativas do ciclo aberto.
- Preservar desativação de colaborador e histórico; não usar exclusão para pessoas com respostas.

### 2. Rever a integridade e segurança do envio público

- Verificar a migration SQL com PostgreSQL/Supabase local. Conferir sintaxe, assinatura, permissões, `search_path`, grants/revokes e compatibilidade com schemas `01`–`09`.
- A RPC pública deve responder apenas com nomes ativos do ciclo e líderes ligados no snapshot, perguntas e dados mínimos; nunca retornar respostas, emails, dados do RH ou resultados.
- A RPC de envio deve validar ciclo aberto, IDs em escopo, relação apropriada ao tipo, escala 1–4, conjunto completo de perguntas por setor, respostas repetidas e duplicidade por respondente/pessoa avaliada. Tabelas continuam inacessíveis para `anon`.
- Revisar possível incompatibilidade entre `questionsForDepartment()` do front e `question_sections`/validação do banco. Garantir que a tela e a RPC esperem exatamente as mesmas perguntas.
- Garantir que sincronização e qualquer rotina de substituição de cache nunca apaguem/rescrevam respostas nativas. A RPC legada `replace_evaluation_cache` deve continuar recusando avaliações com `google_form_id=''`.
- O link é público por decisão do usuário; ainda assim, validar origem, limites, mensagens sem detalhes SQL e considerar limitação anti-spam compatível com Next/Vercel.

### 3. Migração, testes e produção

- Criar migration numerada a partir do schema desejado; **não aplicar diretamente** `supabase/ativar-portal-e-sincronizar-supabase.sql` nem scripts de ativação legados antes de revisão.
- Projeto alvo: Cardiofitness, Supabase ref informado anteriormente `crqzpadgqbjszywfeuip`; reconfirmar no painel antes de qualquer operação. Não usar conta/projeto do Ítalo.
- Fazer backup/contagem antes de escrever ou excluir dados. Preservar Outubro (ciclo `67db7979-8ac0-4d77-a7c4-307075708b87`) e Novembro. Sincronização de Outubro estava incompleta na auditoria anterior (117 cacheadas / 210 esperadas); revisar sem apagar o cache existente.
- A exclusão autorizada de registros de teste continua pendente. Reconfirmar IDs e contagens no projeto certo no momento da ação; não tocar Outubro, Novembro oficial ou cópia oficial de formulários.
- Cobrir com testes: contexto público, submissão, duplicidade, notas incompletas/fora da escala, relacionamentos, funcionário desativado, respostas nativas no dashboard, contagem de pendências, gráficos/evolução e isolamento demo.
- Executar `npm run typecheck`, `npm test`, `npm run build`, inspeção visual/funcional real em navegador e teste de ponta a ponta: criar ciclo/avaliação → enviar formulário público → conferir persistência após reload/login → ver resultados e evolução no painel RH.
- Só depois de migration e E2E: publicar/deploy (Vercel) e verificar URL real. Não afirmar “funcionando em produção” antes disso.

### 4. UI de contingência

- O usuário escolheu remover Google Forms da interface e manter sync legado enquanto a coleta nativa não estiver publicada. Backend, credenciais e endpoints podem continuar, mas renomeie a interface com linguagem genérica/legada e evite abrir configurações Google no fluxo novo.
- Há referências ainda visíveis em `src/components/application.tsx` (mensagens e configurações), `src/lib/export.ts`, mensagens de erro e arquivos `src/lib/google/*`. Não apague backend, OAuth do RH, endpoints ou cache sem avaliar dependências. “Entrar com Google” é autenticação do RH, não Google Forms.

## Pontos de atenção no código atual

- `supabase/config.toml` declara `supabase/schemas/*.sql` em ordem; a tabela existente requer constraints `google_form_url` compatíveis com URL vazia em nativo.
- `src/lib/server/validation.ts:evaluationStructure()` é o payload esperado pelas funções SQL de sync antigas. Não acrescentar campos sem migrar o contrato do banco. A comparação mais ampla de configuração é separada.
- A rota demo não comprova conexão Supabase nem persistência remota.
- `data/cardiofitness-storage.json` é local/gitignored e contém respostas ambíguas da auditoria anterior. Não apagar como “teste” sem identificar ciclo/pessoas; preserve-o.
- Alguns documentos/scripts SQL alterados ou não rastreados no `git status` podem ser restos de tentativas anteriores; inspecione o diff antes de usá-los.

## Critério de pronto

RH cria ciclo e avaliação sem formulário externo; recebe um link público compartilhável; a pessoa responde sem login; a confirmação só aparece após commit no banco; uma segunda tentativa duplicada é tratada sem perder a primeira; RH visualiza resposta, pendência, médias e evolução após reload; RH desativa ex-colaborador mantendo histórico; Outubro/Novembro permanecem íntegros; suíte/build/E2E passam; migration e deploy reais são confirmados.
