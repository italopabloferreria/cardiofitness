# Fluxo simplificado: um link por formulário, vários ciclos

## Como usar no painel

Depois que o RH configurar e mapear o Google Forms **uma única vez**:

1. Abra **Início** (Dashboard). Na área «Criar ciclo e compartilhar o mesmo link», confira os links atuais.
2. Quando precisar de novo ciclo, clique em **Criar próximo ciclo**.
3. Confira as datas propostas, a quantidade de colaboradores ativos e a referência anterior. O período seguinte acompanha a periodicidade do ciclo-base: **mensal ou bimestral**.
4. Clique em **Criar ciclo e manter links**. O sistema usa a transação existente `prepare_evaluation_cycle`, registra o ciclo e copia os vínculos e mapeamentos de cada formulário da referência. **Não cria nem copia Google Forms.**
5. Na confirmação ou no Início do novo ciclo, clique em **Copiar link** para encaminhar manualmente no WhatsApp.

O mesmo endereço permanece válido porque a importação usa a data do envio, o identificador do formulário e o período do ciclo, guardando o histórico separado para cada ciclo. Os vínculos de liderança são capturados a partir do cadastro ativo no momento da criação do ciclo.

## Regras e cuidados

- A versão simplificada compartilha links de **colaboradores → líderes** e **líderes → colaboradores**. O formulário de colegas e autoavaliação continua no modo avançado e segue a frequência bimestral definida pelo RH.
- O preparo do ciclo copia as avaliações que já estavam vinculadas à referência. Se existia equipe/autoavaliação, a configuração também é reproduzida; revise a periodicidade antes de enviar esses links. Não marque avaliações da equipe como concluídas se o RH não abriu a coleta.
- O recurso bloqueia ciclos com formulários sem ID/mapeamento, colaboradores sem liderança ativa e ciclos-base que não tenham períodos mensais/bimestrais completos. Nesses casos, acesse **Configurações → Avançado**.
- O recurso respeita a proibição de reutilizar o mesmo formulário em **ciclos com períodos sobrepostos**, a fim de impedir dupla contagem.
- O Google Forms permanece um serviço separado. **Criar um ciclo no Cardiofitness não abre, fecha ou edita listas do Google Forms**. O RH deve confirmar que está aceitando respostas e revisar as opções de nomes sempre que houver admissão/desligamento.
- Formulários novos ou com perguntas modificadas exigem revisão de mapeamento na configuração avançada; links antigos podem ser reutilizados enquanto suas perguntas e IDs continuarem os mesmos.
- Se houver um ciclo já ativo (por exemplo, novembro/dezembro), não crie um duplicado para o mesmo período. Basta copiar o link no Dashboard e compartilhar.
- A prévia do novo ciclo não altera nada. O cadastro e os vínculos históricos anteriores permanecem intocados. Se o ciclo anterior já contém respostas, continua protegido contra alterações estruturais.

## Limitações operacionais atuais

A melhoria está em uma **branch de revisão**, não publicada em produção. Ela reutiliza a RPC e o banco institucionais já configurados, sem credenciais novas e sem alterar projetos de terceiros. A nova interface precisa ser revisada na prévia da Vercel, com uma conta RH autorizada, antes da publicação. A criação e a contabilização de respostas em produção só ficam confirmadas após esse teste.
