# Ativação após a autorização da Cardiofitness

Este roteiro orienta a ativação do sistema. O Apps Script já foi autorizado para preencher os rascunhos; essa autorização é separada do OAuth somente leitura da aplicação, ainda pendente.

Dois formulários recriados na conta `cadiofit@gmail.com` têm o fluxo público conferido: 63 perguntas, três seções de Líderes e oito de Equipe. Os 12 caminhos de setor × Sim/Não foram percorridos nos originais sem enviar respostas. Escalas 1–4: sete de Líderes sem rótulos nas pontas e 31 de Equipe com “Abaixo do esperado” / “Alto desempenho”. Finais, rotas e tema foram reproduzidos; ambos permanecem rascunhos não publicados.

As configurações dos novos formulários foram definidas e conferidas após autorização de Ítalo: identificação declarada por nome e setor, sem coleta adicional de e-mail, vários envios permitidos, edição após envio desativada, resumo dos resultados oculto, barra de progresso e link para outra resposta ativos. Edição e respostas permanecem restritas à conta institucional proprietária. As mensagens de confirmação foram definidas para os novos destinos; não são apresentadas como cópia das configurações privadas dos originais. Não é necessário compartilhar os originais. IDs, links e evidências estão em [CLONAGEM_FORMULARIOS.md](docs/CLONAGEM_FORMULARIOS.md). O próximo roteiro está em [ATIVACAO_GOOGLE.md](docs/ATIVACAO_GOOGLE.md); responsabilidades em [CONTA_EMPRESA.md](docs/CONTA_EMPRESA.md). Os usuários do RH terão logins individuais no Supabase.

## 1. Supabase

Projeto institucional já criado no plano gratuito em São Paulo: `crqzpadgqbjszywfeuip`. Schema `supabase/schemas/01_cardiofitness.sql` aplicado e verificado em 08/10/2026: cinco tabelas com RLS, sem acesso anônimo e políticas por associação em `rh_users`. Cadastro público e login anônimo desativados; confirmação de e-mail mantida. O arquivo declara tabelas, índices, políticas de acesso, validações e a transação de sincronização. Não reaplique diretamente em um banco já populado; nesse caso, gere e revise a migração com o fluxo declarativo da CLI Supabase.

Em Authentication, mantenha inscrições públicas desativadas e provisione as contas individuais do RH pelo painel administrativo. Copie o UUID de cada conta autorizada e use `supabase/first-rh.sql` como modelo para conceder acesso individual. O cadastro de uma conta não concede acesso ao RH automaticamente.

Conexão local já configurada em `.env.local`, sem expor chaves no pacote. Para outro ambiente, preencha:

```dotenv
APP_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=https://crqzpadgqbjszywfeuip.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=CHAVE_PUBLICAVEL_DO_PROJETO
APP_URL=http://127.0.0.1:3000
```

Use uma chave publicável. Não coloque `service_role` ou secret key em variáveis `NEXT_PUBLIC_`. As políticas exigem que o usuário autenticado esteja na tabela `rh_users`, inclusive para ler resultados. Remover o vínculo de RH revoga a autorização independentemente de metadados editáveis do usuário.

## 2. Google Cloud e autorização de leitura

Crie/configure o projeto Google Cloud da integração sob controle da Cardiofitness, habilite a Google Forms API e configure a tela de consentimento OAuth. A conta institucional já é proprietária dos rascunhos; não depende do compartilhamento dos originais para acessá-los. Crie um cliente OAuth que permita o retorno local `http://127.0.0.1:42813/oauth2callback`; use cliente Web com esse retorno exato ou cliente Desktop compatível com retorno de loopback. Se o aplicativo estiver em teste, inclua a conta dedicada autorizada como usuária de teste. A autorização anterior do Apps Script não fornece as credenciais nem o token da aplicação.

Preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` em `.env.local`. Execute:

```powershell
npm run google:authorize
```

O navegador abrirá o consentimento da conta dedicada autorizada. O responsável pela conta conclui a autorização diretamente no Google. O fluxo usa PKCE e estado anti-forjamento; o token de renovação é gravado somente em `.env.local`, sem ser impresso. Os escopos solicitados são `forms.body.readonly` e `forms.responses.readonly`.

Aplicativos OAuth externos em modo de teste podem ter limitações de duração das autorizações; valide o estado de publicação e as políticas da organização Google antes de ativar a operação contínua. Não conceda escopos de edição: esta integração não altera formulários nem envia respostas.

Como alternativa, uma conta de serviço pode usar `GOOGLE_SERVICE_ACCOUNT_EMAIL` e `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, desde que os formulários sejam explicitamente compartilhados com ela e a organização permita esse acesso. OAuth com a conta autorizada é o caminho principal preparado.

## 3. Formulários e cadastros

Use os novos links de edição registrados em [CLONAGEM_FORMULARIOS.md](docs/CLONAGEM_FORMULARIOS.md), copiando apenas o ID de cada rascunho. As perguntas têm novos IDs e exigem novo mapeamento; o histórico dos originais não foi transferido. O fluxo público e o tema foram reproduzidos. As configurações de coleta estão definidas; valide cadastros e aliases antes de publicar e distribuir os novos links. Depois, configure esses links no botão “Abrir Google Forms”; os links originais ficam como referência. A conta institucional já é proprietária dos destinos, sem necessidade de compartilhar os originais.

Cadastre as pessoas com o nome completo, setor, nome exatamente utilizado no formulário, liderança e status. E-mail é opcional para os formulários que usam nomes, mas deve corresponder ao coletado pelo Google quando houver coleta de e-mail. Consulte [divergencias-colaboradores.md](google-forms/divergencias-colaboradores.md): a comparação com o PDF preserva diferenças entre cadastros e formulários. Nenhum nome ou vínculo foi corrigido automaticamente; confirme aliases e setores antes da sincronização.

Crie o ciclo bimestral e selecione os participantes. Os líderes podem ser referenciados nos vínculos do ciclo sem serem avaliadores participantes. Configure os dois novos formulários nesse ciclo:

- Líderes: tipo “Colaborador → Líder”.
- Equipe e autoavaliação: tipo “Equipe e autoavaliação”; respostas em que a pessoa avaliada coincide com a respondente serão classificadas como autoavaliação.

O vínculo pode ser salvo como rascunho apenas com o link público, deixando o ID de edição e as perguntas vazios. A sincronização fica bloqueada até completar a configuração; nenhum resultado anterior é alterado. Depois da autorização, informe o ID e use “Ler perguntas” para trazer a estrutura autorizada pela API. Marque todas as perguntas de nome de respondente, pessoa avaliada e setor usadas nas seções condicionais, além das perguntas numéricas. A integração utiliza apenas as seções efetivamente respondidas. Não selecione os campos textuais de feedback. Perguntas da mesma avaliação devem usar a mesma escala, neste caso 1 a 4.

Informe a quantidade de respostas esperadas conforme os participantes e as relações de avaliação definidas pela Cardiofitness. Uma pessoa pode avaliar vários colegas; o sistema não presume que o total esperado seja igual ao número de colaboradores.

## 4. Primeira conferência autorizada

Reinicie o sistema e entre com a conta do RH. Sincronize cada formulário e confira uma amostra contra o Google Forms: identidade, setor, avaliado, período, notas e quantidade. Ajuste cadastros e mapeamento se houver respostas sem correspondência. Respostas duplicadas da mesma combinação usam o envio mais recente. Campos de feedback não fazem parte do cache.

Teste também as políticas no projeto real: usuário sem vínculo de RH não pode consultar tabelas nem rotas; sessão expirada deve solicitar entrada; falha de autorização Google deve preservar os dados anteriores. Execute os advisors de segurança do Supabase antes de publicar.

## 5. Vercel

Suba esta pasta em um repositório e importe-o na Vercel como Next.js. Configure as mesmas variáveis na Vercel, mantendo `APP_DEMO_MODE=false` e atualizando `APP_URL` para o domínio HTTPS da aplicação. Escolha runtime Node.js 22 ou superior suportado pela plataforma. Não envie `.env.local` ao repositório.

Confirme o acesso pelo domínio final, login do RH, leitura e sincronização dos dois formulários, exportações e logout. Os rascunhos Google e o projeto Apps Script já existem; a aplicação e os formulários ainda não foram publicados para operação.


Atualização de ativação — 08/10/2026: conta institucional criada no Supabase Auth e autorizada em rh_users após confirmação explícita. Projeto Google Cloud cardiofitness-avaliacoes criado na conta institucional, Google Forms API ativa, cliente Web Cardiofitness Sistema RH Local criado com retorno http://127.0.0.1:42813/oauth2callback e escopos forms.body.readonly / forms.responses.readonly. Aplicativo em Testing. Segredo do cliente ainda não configurado: tentativa de download pelo navegador não disponibilizou arquivo. Google não permite recuperar segredo já oculto; responsável deverá localizar o download ou criar/adicionar novo segredo diretamente e salvá-lo localmente. Nenhuma autorização OAuth da aplicação concedida, token persistente obtido ou resposta privada lida. Publicação Vercel pendente.
