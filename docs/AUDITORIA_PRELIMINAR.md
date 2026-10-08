# Auditoria preliminar — 08/10/2026

O responsável priorizou publicação para apresentação e testes antes da conclusão da auditoria completa.

## Correções nesta entrega

- Histórico individual: abrir uma avaliação agora seleciona o ciclo correspondente.
- Paginação: a página exibida se ajusta quando filtros ou cadastros reduzem os resultados.
- Mapeamento: perguntas anteriores à primeira seção aparecem como “Identificação inicial”.
- Google Forms: presença de variáveis é descrita como credenciais configuradas, sem afirmar que o token está válido.
- Integridade: o mesmo formulário não pode ser contado duas vezes em ciclos com datas coincidentes.
- Sincronização: respostas anteriores que desaparecerem da consulta bloqueiam a substituição do histórico. Nova resposta do mesmo par respondente/avaliado continua atualizando as notas.

Migração `supabase/schemas/03_integrity_audit.sql` aplicada ao projeto real. Não cria demonstrações nem modifica os 33 cadastros oficiais. TypeScript, 106 testes e build de produção aprovados.

## Pendências explícitas

- Recuperação de senha: botão e fluxo de “Esqueci minha senha” ainda não implementados.
- Senha temporária: responsável precisa concluir a alteração da conta institucional no Supabase. A marca de troca obrigatória deve ser ativada após definir a senha. Nenhuma credencial faz parte do repositório.
- Validar login por senha e troca obrigatória com o responsável, sem o agente escolher a senha definitiva.
- Limitar as escalas configuráveis à escala 1–4 usada pelos relatórios, ou tornar os relatórios dinâmicos antes de usar outra escala.
- Revisar OAuth Google em Testing e a duração da autorização Forms antes do uso contínuo.
- RH definir o primeiro ciclo, publicar a coleta e homologar identificação, sincronização e relatórios com respostas reais.

Esta entrega permite apresentar e iniciar testes supervisionados; não representa homologação de operação contínua.
