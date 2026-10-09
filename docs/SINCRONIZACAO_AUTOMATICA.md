# Sincronização automática

## Fluxo do RH

1. Criar o ciclo com datas e participantes corretos.
2. Vincular os formulários da conta institucional. Formulários conhecidos recebem o mapeamento já conferido; outros exigem conferir as perguntas antes de salvar.
3. Distribuir o link de preenchimento. Google Forms continua sendo a coleta.
4. A rotina de servidor consulta as respostas a cada dois minutos, mesmo com o painel fechado, **após a ativação do agendador**.
5. O painel aberto consulta os resultados salvos a cada 30 segundos. O botão Sincronizar permanece para antecipar uma consulta.

Respostas precisam estar dentro das datas do ciclo, identificar pessoas cadastradas e respeitar os vínculos e as escalas. Respostas incompatíveis são informadas como rejeitadas; não são atribuídas por aproximação de nomes. Uma resposta inválida não deve impedir a importação das válidas. Resultados já importados são preservados quando deixam de aparecer na consulta ao Google.

## Ativação pelo responsável técnico

- Aplicar `supabase/schemas/04_automatic_sync.sql` no projeto institucional.
- Configurar `SUPABASE_SECRET_KEY` (ou a chave legada `SUPABASE_SERVICE_ROLE_KEY`) exclusivamente no servidor da Vercel. Nunca usar prefixo NEXT_PUBLIC.
- Configurar `CRON_SECRET` aleatório, com pelo menos 32 caracteres, no servidor.
- Guardar o mesmo CRON_SECRET no Supabase Vault, com nome `cardiofitness_sync_secret`.
- Publicar a versão do sistema e aplicar `supabase/schedule-automatic-sync.sql`.
- Verificar o retorno HTTP do agendador e a data da última sincronização da avaliação. O simples disparo de um job não comprova importação bem-sucedida.

## Teste de aceitação

Usar formulário, pessoas e ciclo claramente identificados como TESTE, separados de Outubro. Enviar uma resposta pelo Google Forms; aguardar o agendador, sem clicar em Sincronizar; comprovar resposta e pontuação no painel. Verificar mais uma execução para garantir ausência de duplicação. Manter os registros para conferência e remover somente quando solicitado.

## Situação desta entrega

Ativada em produção em 09/10/2026: migração 04 aplicada, credenciais somente no servidor da Vercel e Supabase Vault, agendador cardiofitness-forms-sync ativo a cada dois minutos. Deploy de ativação: 5UKQJvZthaqhY1rXopWEqq1omkcG (commit 7815040). Primeira execução comprovada às 16:40 UTC: HTTP 200, três avaliações consultadas, três sincronizadas, nenhuma falha.

Teste real em formulário separado: resposta enviada pelo Google Forms e importada pelo agendador, sem clicar em Sincronizar. Resultado no painel: uma resposta, 100% de participação, média 3,00/4, respondente e líder fictícios corretos. Outubro mantém os 33 participantes oficiais; os dois cadastros de teste estão separados em ciclo sem validade oficial e permanecem para revisão do responsável. Não distribuir o formulário de teste ao RH.

Segunda execução automática comprovada às 16:42 UTC: data da sincronização avançou e a contagem permaneceu em uma resposta, sem duplicação.

## Respostas de texto

A partir da migra��o `05_text_answers.sql`, os campos de resposta curta e par�grafo do Forms s�o importados junto das notas. Campos usados para identifica��o n�o s�o duplicados como feedback. Perguntas sem resposta e se��es condicionais n�o preenchidas n�o aparecem. O conte�do � preservado como texto, sem executar HTML.

No resultado da avalia��o, a se��o **Respostas de texto** mostra pergunta, resposta, respondente, pessoa avaliada, data e perspectiva. Os filtros de pessoa e perspectiva tamb�m se aplicam aos textos. Apenas RH autorizado acessa o conte�do.

A sincroniza��o consulta novamente o hist�rico dos ciclos eleg�veis, preenchendo os textos das respostas j� importadas sem exigir novo envio. As regras de per�odo, identifica��o, v�nculos e deduplica��o permanecem. Textos n�o alteram m�dias.
