# Plano — falha fechada do portal público de avaliações

## Diagnóstico
- A API de contexto cai para ciclo e pessoas hardcoded se o Supabase falha ou não tem dados; isso mascara a desconexão e expõe dados pessoais na página pública.
- A API de envio grava primeiro em JSON local, tenta o Supabase depois e retorna sucesso mesmo quando o banco rejeita a operação.
- A migration pública pendente concede acesso amplo de leitura e alteração a `anon`; o script de ativação também sobrescreve cadastros/ciclo. Nenhum SQL remoto será executado.

## Decisão
Conforme o escopo do projeto, o portal nativo continua prévia até existir o fluxo de identidade seguro (códigos fortes com hash, sessão curta, atribuições validadas no servidor, rate-limit, RLS e homologação). Google Forms permanece a coleta legada. Não liberar escritas públicas nem exibir roster/ciclo de fallback.

## Alterações planejadas
1. Remover os fallbacks oficiais das rotas públicas: fora do modo demo, responder indisponível sem expor colaboradores.
2. Fazer o hook de formulário iniciar vazio e propagar o erro, sem inventar ciclo, funcionários ou avaliações.
3. Impedir a rota de envio de salvar JSON local/Supabase fora do modo demo e responder com erro explícito; o modo demo não deve atingir o banco real.
4. Restringir o merge do armazenamento demo aos IDs que já existem nas fixtures, para não misturar registros locais órfãos/legados.
5. Renderizar aviso de prévia indisponível em vez de “ciclo ativo”/“envio concluído” quando o contexto real não estiver habilitado.
6. Adicionar testes de rota que comprovem bloqueio sem persistência; executar typecheck, testes e build.

## Fora do escopo
- Não aplicar migrations/SQL, alterar RLS/grants, tocar em cadastros/ciclos/respostas existentes, importar respostas ou expor chaves.
- Não implantar mudanças na Vercel. A conexão RH legado será testada somente por leitura; respostas históricas serão verificadas por credencial autorizada, sem criar resposta de teste em produção.
