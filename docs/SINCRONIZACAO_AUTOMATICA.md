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

Código preparado não significa agendador ativado. Registrar aqui a ativação e o resultado do teste somente depois de comprovados no ambiente publicado.
