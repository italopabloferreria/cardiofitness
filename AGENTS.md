# Cardiofitness Avaliações

> **Retomada atualizada em 2026-11-19:** antes de continuar, leia `CODEX_START.md` para o estado do commit, produção, pendências, riscos e próximo passo. Este documento mantém instruções permanentes do projeto.

Escopo legado (produção atual): Dashboard; Colaboradores; Avaliações Google Forms; Resultados; Relatórios; Configurações. Direção autorizada: portal de avaliações nativas no site, link compartilhável, criação de ciclos/avaliações pelo RH e painel de acompanhamento. Parte do portal foi implementada localmente no commit `d3680a2`, mas **não está confirmada em produção**: schema/migration remota, E2E real e deploy permanecem pendentes. Preserve o sistema legado durante a transição.

Os dois formulários fornecidos pelo usuário usam escala 1 a 4. O formulário de equipe permite avaliar colegas e a própria pessoa, com seções condicionais por setor. Respostas próprias são autoavaliações; colegas não devem ser classificados como líderes. Conteúdos de feedback não são importados.

Google Forms permanece como coleta **legada até o lançamento nativo**; mantenha sync legado enquanto necessário e remova apenas sua apresentação de coleta futura. Supabase mantém cadastros, vínculos de liderança por ciclo, configurações e cache normalizado das respostas. Respondentes não têm conta nem acesso ao sistema RH; o fluxo público deve usar operação server-side restrita, sem leitura/escrita pública direta às tabelas. Acesso ao dashboard e dados administrativos somente para RH autorizado. Nunca transformar ausência de credenciais em acesso irrestrito. Demonstração exige APP_DEMO_MODE=true e usa exclusivamente dados fictícios locais. Veja `docs/ARQUITETURA_PORTAL_NATIVO.md` e `CODEX_START.md`.

Notas e respostas devem corresponder a avaliações autênticas. Não invente nota máxima, resposta ou submissão de pessoa real para teste. Use ambiente isolado para E2E. O usuário aprovou anteriormente a limpeza de registros claramente identificados como teste; confira IDs e contagens atuais antes de excluir e preserve Outubro/Novembro oficiais. Não execute `supabase/ativar-portal-e-sincronizar-supabase.sql`; veja análise em `CODEX_START.md`.

Contratos compartilhados: src/lib/types.ts. Integrações precisam de validação de entrada, paginação, deduplicação, identificação sem ambiguidade e erros seguros. Credenciais fora dos fontes. Ambiente sem projeto Supabase: preparar esquema e instruções; não afirmar conexão real nem provisionar projeto pago.

Verificar com npm run typecheck, npm test, npm run build e revisão visual/funcional no navegador. Tarefa complexa: delegar partes independentes. Preservar PDF e demais entregas anteriores.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
