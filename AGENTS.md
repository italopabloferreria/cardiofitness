# Cardiofitness Avaliações

Escopo legado (produção atual): Dashboard; Colaboradores; Avaliações Google Forms; Resultados; Relatórios; Configurações. Nova direção, autorizada em novembro de 2026: portal de avaliações nativas no site, link permanente, ciclos automáticos e novo dashboard. Preservar sistema legado durante transição; novas rotas inicialmente somente como prévia sem persistência.

Os dois formulários fornecidos pelo usuário usam escala 1 a 4. O formulário de equipe permite avaliar colegas e a própria pessoa, com seções condicionais por setor. Respostas próprias são autoavaliações; colegas não devem ser classificados como líderes. Conteúdos de feedback não são importados.

Google Forms permanece como coleta **legada até o lançamento nativo**; API somente leitura no servidor. Supabase mantém cadastros, vínculos de liderança por ciclo, configurações e cache normalizado das respostas. A coleta nativa futura deve usar autenticação segura e migrar dados historicamente sem deleção. Veja docs/ARQUITETURA_PORTAL_NATIVO.md. Acesso real somente para RH autorizado. Nunca transformar ausência de credenciais em acesso irrestrito. Demonstração exige APP_DEMO_MODE=true e usa exclusivamente dados fictícios locais.

Contratos compartilhados: src/lib/types.ts. Integrações precisam de validação de entrada, paginação, deduplicação, identificação sem ambiguidade e erros seguros. Credenciais fora dos fontes. Ambiente sem projeto Supabase: preparar esquema e instruções; não afirmar conexão real nem provisionar projeto pago.

Verificar com npm run typecheck, npm test, npm run build e revisão visual/funcional no navegador. Tarefa complexa: delegar partes independentes. Preservar PDF e demais entregas anteriores.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
