# Guia de operação do RH — Cardiofitness

## O papel de cada ferramenta

Google Forms coleta respostas identificadas. O sistema consulta essas respostas via Forms API quando o RH clica em Sincronizar, identifica respondente e avaliado e organiza resultados por ciclo. Supabase guarda cadastros, lideranças, vínculos, ciclos, configurações e resultados importados. Entrar com Google autentica o RH; a autorização para ler Forms é uma conexão separada, configurada no servidor.

Não existe atualização automática em segundo plano nem escrita nas opções do Forms nesta versão. Adicionar um nome ao Forms não cadastra a pessoa no sistema; cadastrar no sistema também não edita a lista do Forms.

## Cadastro e identificação

A fonte oficial é o PDF enviado pelo RH. Os 33 cadastros iniciais (28 colaboradores e cinco líderes) já estão importados. Para uma nova pessoa:

1. Em Colaboradores, cadastrar nome, setor e liderança; e-mail é opcional.
2. Conferir o campo Nome no formulário. Ele deve corresponder à opção usada no Google Forms.
3. Incluir a pessoa no ciclo antes de haver resultados importados nesse ciclo.
4. Acrescentar manualmente a opção correspondente nas seções relevantes dos Forms e conferir seus caminhos condicionais.
5. Após respostas, usar Sincronizar na avaliação do ciclo.

Exemplo: Ana Souza, da Recepção, liderada por Cleuma, precisa estar no cadastro e nos participantes do ciclo. Se responder identificando-se como Ana Souza e avaliar Cleuma, o sistema verifica esse vínculo antes de importar.

A correspondência ignora diferenças de maiúsculas, acentos e espaços, mas não aproxima nomes diferentes. Se a resposta trouxer e-mail, ele tem prioridade e precisa corresponder ao cadastro. Se houver homônimos, o setor mapeado precisa distinguir as pessoas. Identificação inexistente, ambígua ou liderança incompatível impede a atribuição daquela resposta. Nunca atribuir por suposição.

## Ciclos bimestrais

Não é necessário criar outro Google Forms a cada bimestre. Criar um novo ciclo no sistema, definir início (fim sugerido para dois meses), selecionar participantes e vincular novamente os formulários existentes. Cada vínculo de avaliação pertence a seu ciclo. Não usar períodos sobrepostos para os mesmos formulários.

A data de última submissão da resposta, convertida para horário de São Paulo, determina se ela entra no período, incluindo o primeiro e o último dia. Respostas fora dele não entram naquele ciclo. Cada avaliação conserva a resposta válida mais recente para cada par respondente/avaliado, evitando contar duplicidades.

Não apagar respostas antigas dos Forms nem editar respostas de ciclos encerrados. Como esta versão usa a última submissão informada pelo Google, uma edição tardia pode deslocar a resposta de período e alterar os resultados numa nova sincronização. Se for necessário permitir essas edições, adaptar o tratamento do histórico antes da operação.

Após haver resultados importados, datas, participantes e estrutura da avaliação ficam protegidos. Inclusões posteriores ficam para o próximo ciclo no fluxo atual. Desativar uma pessoa preserva seu histórico; não equivale a apagar suas avaliações.

## Rotina de cada bimestre

1. Revisar cadastros e listas dos Forms.
2. Criar ciclo e selecionar participantes e vínculos.
3. Vincular os dois formulários e conferir quem responde, quem é avaliado, setor e perguntas de nota no mapeamento. Presets já preparados com os IDs reais.
4. Publicar os formulários e distribuir os links de coleta pelo processo da empresa.
5. Na página Avaliações, selecionar o ciclo e clicar em Sincronizar em cada avaliação.
6. Conferir quantidades importadas, duplicadas, rejeitadas e fora do período. Corrigir cadastro/mapeamento e sincronizar novamente se necessário.
7. Consultar Dashboard, resultado da avaliação e detalhe individual; exportar relatórios PDF/Excel.

Se já houver histórico e aparecerem respostas rejeitadas, a nova sincronização é bloqueada e o histórico anterior é preservado. Na primeira importação, respostas válidas podem entrar e as inválidas são indicadas no resumo. Falha na API não deve apagar resultados já existentes.

## Situação antes de começar

Google login validado; Supabase conectado e cadastro importado; leitura dos metadados dos Forms validada. Ainda faltam alinhamento das listas dos Forms ao PDF, primeiro ciclo, publicação da coleta e uma sincronização real conferida. Os Forms clonados permanecem rascunhos. Nenhuma resposta real foi enviada como teste pelo agente.

Minha conta permite alterar senha do sistema, independente do Gmail. A infraestrutura de troca obrigatória da provisória existe, mas a senha provisória e a marca de primeiro acesso ainda não foram ativadas na conta real.
