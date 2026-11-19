# Retomada — Sistema de Avaliações Cardiofitness

**Atualizado em:** 2026-11-19  
**Para:** Antigravity (ou outro agente executor)  
**Primeiro arquivo:** `AGENTS.md`

## Resumo executivo

O portal nativo recebeu uma implementação local, commitada em `main` como **`d3680a2 feat: add native evaluation portal flow`**. A suíte local passou; porém, o portal **não está confirmado em produção**. A migration não foi aplicada ao Supabase remoto, nenhum deploy foi feito nesta etapa e nenhum E2E real foi executado. Trate como trabalho incompleto até provar o fluxo real.

O pedido do RH é um formulário simples no próprio sistema: RH cria ciclo/avaliação e compartilha link público; pessoas respondem sem login; o Supabase guarda os dados; apenas RH acessa dashboard e resultados. O usuário aceita seleção simples de respondente/avaliado e não quer portal/login de funcionário. As notas precisam ser reais — não crie respostas artificiais em produção.

## Estado verificado

### Repositório

- Branch: `main`; commit mais recente observado: `d3680a2`.
- Commit implementa UI pública, contexto/submissão por RPC, templates/mapeamento, integração ao aplicativo e schema aditivo `supabase/schemas/10_native_public_forms.sql`.
- Validações executadas após a última correção do teste: `npm run typecheck` passou; `npm test` passou (**34 arquivos, 223 testes**); `npm run build` passou (Next.js 16.4.6).
- O teste da RPC usa PGlite local. Isso comprova comportamento nesse teste isolado, **não** acesso ou persistência no Supabase real.
- O `git status` na criação desta passagem tinha mudanças não commitadas e não revisadas integralmente:
  - Modificado: `supabase/atualizar-colaboradores-pdf-novembro-2026.sql`.
  - Não rastreados: `docs/PLANO_CORRIGIR_PORTAL_PUBLICO.md`, `docs/PLANO_SISTEMA_CARDIOFITNESS_PARA_HOJE.md`, `supabase/ativar-portal-e-sincronizar-supabase.sql`.
  - **Não descarte, não execute e não inclua em commit sem inspecionar.** Não faça `git add .`.
- O build alterou `next-env.d.ts`; a alteração gerada foi revertida. Confirme o estado atual antes de continuar.

### Produção e dados (última observação anterior; reconfirmar)

- O painel publicado ainda aparentava a versão anterior do sistema; a produção não foi atualizada pelo commit `d3680a2`.
- A captura enviada pelo usuário em Pendências mostrava Novembro/2026 com zero respostas e aviso: **“2 participações a conferir: o formulário ainda não possui perguntas numéricas configuradas ou o total esperado difere das atribuições do ciclo.”** Diagnostique separadamente mapeamento de perguntas e total esperado/atribuições, sem “corrigir” números por suposição.
- Auditoria somente leitura anterior (18/11) encontrou Outubro/2026 com **117 respostas cacheadas de 210 esperadas**: liderança 22/28 e equipe 95/182. Última sincronização armazenada: 22/10; tentativa posterior: 28/10. Outubro exige reconciliação/sync manual autenticado pelo RH; não apagar respostas existentes. Esses números podem ter mudado — conferir antes de agir.
- O ciclo de teste anteriormente confirmado é `88d6a7d2-184f-4313-80b3-cbb8ff30317f`; avaliação `392a2251-b6e1-40d5-9782-c7310b94613b`; havia uma resposta e dois cadastros fictícios. O usuário **aprovou a remoção dos registros de teste e da cópia de Form ID `1FWQPgcZOcPICxHELoqaYGzDpa1wnlKEIP8430Zy-Zz8`**, mas a remoção **não foi feita**. Antes de executar, confirmar no projeto correto as IDs/contagens/associações atuais. Outubro, Novembro oficial e Forms oficiais ficam intocados.
- Projeto Supabase Cardiofitness que foi identificado anteriormente: ref `crqzpadgqbjszywfeuip`, conta institucional `cadiofit@gmail.com`. Reconfirme no painel antes de qualquer operação; não use a conta/projeto do Ítalo.
- Nenhuma resposta real de avaliação foi enviada nesta etapa. O pedido de “dar nota máxima” para uma pessoa da administração não foi executado porque seria inventar um dado de RH sem avaliação autêntica. Não transforme isso em tarefa de escrita de produção.

## Risco crítico: SQL que não deve ser executado

O arquivo não rastreado `supabase/ativar-portal-e-sincronizar-supabase.sql` é inseguro. A inspeção identificou `GRANT SELECT` anônimo para pessoas/ciclos/avaliações e `SELECT/INSERT/UPDATE` para respostas, políticas permissivas (`using (true)`/`with check (true)`), upsert de pessoas reais e alteração do ciclo de Novembro. **Não executar nem copiar para o SQL Editor.**

A migration commitada `supabase/schemas/10_native_public_forms.sql` é o caminho provável, mas ainda precisa de revisão de segurança independente: ela cria funções públicas `SECURITY DEFINER` liberadas a `anon`, inclusive uma RPC de escrita. Confirmar cuidadosamente limites de dados retornados, vínculo respondente/avaliado, perguntas por setor, ciclo aberto, grants/revokes, `search_path`, exposição da chave primária e mitigação contra spam. Não abrir acesso direto às tabelas como atalho.

## Plano de continuação — prioridade

| Prioridade | Trabalho | Aceite / método | Risco / dependências |
|---|---|---|---|
| **MUST 1** | Inventariar mudanças atuais e reproduzir o aviso de Pendências com dados somente leitura | `git status`/diff; login no painel Cardiofitness; conferir ciclos, avaliações, mapping, vínculos e contagens antes de qualquer escrita | Alto: dados reais; projeto e conta precisam ser confirmados |
| **MUST 2** | Revisar e testar de forma segura `10_native_public_forms.sql` e rotas `/api/public/*` | Teste Postgres/Supabase local isolado; revisão de função definer, grants, RLS, relação e duplicidade; nenhum grant amplo a `anon` | Alto: escrita pública e dados de RH; dependência das schemas `01`–`09` |
| **MUST 3** | Completar fluxo RH → ciclo → avaliação nativa → link público | RH configura ciclo ativo e avaliações nativas com mapping numérico/pergunta/escala 1–4; link entrega contexto compatível | Alto: Novembro não deve receber valores assumidos nem substituir avaliações legadas |
| **MUST 4** | Integrar respostas nativas ao painel de RH | Após persistência, resposta aparece em resultados, pendências, estatísticas e gráficos depois de reload/login; duplicidade não conta duas vezes | Alto: analytics e schemas legados; preservar Outubro e histórico |
| **MUST 5** | Fazer E2E sem inventar avaliação para funcionário real | Use Supabase local/staging e usuários fictícios isolados. Em produção, somente resposta autêntica submetida por quem avalia; não fabrique notas para “provar” | Deploy e credenciais do projeto correto dependem do ambiente |
| **SHOULD** | Sincronizar/reconciliar Outubro e corrigir o erro do ciclo atual | Sync manual autenticado; comparar origem, IDs e contagens antes/depois; explicar participações “A conferir” | Não apagar cache/histórico; inspeção antes de sync |
| **SHOULD** | Remover os registros de teste aprovados | Revalidar as IDs e contagens confirmadas acima no Supabase Cardiofitness, excluir apenas as entidades aprovadas e verificar saldo; colocar a cópia Form aprovada na lixeira | Exclusão banco permanente; não atingir Outubro/Novembro oficial |
| **LATER** | Ajustes finais de interface e documentação operacional | Ocultar menções de Google Forms como coleta futura, mas manter sync legado; melhorar dashboard após dados reais confirmados | Não quebrar fluxo legado durante transição |

Skills/documentação úteis: `supabase`, `supabase-postgres-best-practices`, `systematic-debugging`, `verification-before-completion`; para Next, consultar guias em `node_modules/next/dist/docs/`. Executar typecheck, testes e build novamente antes de release.

## Critério de pronto

Só declarar o sistema funcional em produção após comprovar, no projeto correto: ciclo e perguntas configurados, link público acessível sem login de funcionário, submissão verdadeira persistida, resposta visível no painel RH após reload, pendências/gráficos corretos, duplicidade controlada, histórico de Outubro preservado e deploy publicado/verificado. Demonstração local, 223 testes e build **não substituem** essa prova.

## Próxima ação única

Antigravity deve primeiro verificar `git status` e revisar os quatro arquivos não commitados listados acima, depois fazer uma leitura somente leitura do Supabase Cardiofitness para reproduzir o aviso de Pendências e confirmar o estado de Outubro/Novembro antes de qualquer escrita.
