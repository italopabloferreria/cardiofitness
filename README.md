# Cardiofitness Avaliações

Sistema de avaliações para o RH, desenvolvido a partir da apresentação visual. Next.js + Supabase + Google Forms API.

Identidade visual com o logotipo original enviado pelo usuário, azul-marinho, ciano e fontes IBM Plex Sans e Poppins locais, alinhados ao [site oficial da Cardiofitness](https://cardiofitness.com.br/). Fontes e adaptações estão documentadas em [IDENTIDADE_VISUAL.md](docs/IDENTIDADE_VISUAL.md).

**Etapa atual:** aplicação local conectada ao Supabase institucional e demonstração desativada. Tela exige login; primeiro usuário e autorização RH ainda pendentes. Dados fictícios anteriores permanecem apenas no armazenamento local da demonstração, sem importação no banco. Dois formulários recriados na conta `cadiofit@gmail.com` têm o fluxo público conferido: 63 perguntas, três seções de Líderes e oito de Equipe. Os 12 caminhos de setor × Sim/Não foram percorridos nos originais sem enviar respostas. Escalas 1–4: sete de Líderes sem rótulos nas pontas e 31 de Equipe com “Abaixo do esperado” / “Alto desempenho”. Finais, rotas e tema foram reproduzidos; ambos permanecem rascunhos não publicados.

As configurações dos novos formulários foram definidas e conferidas após autorização de Ítalo: identificação declarada por nome e setor, sem coleta adicional de e-mail, vários envios permitidos, edição após envio desativada, resumo dos resultados oculto, barra de progresso e link para outra resposta ativos. Edição e respostas permanecem restritas à conta institucional proprietária. As mensagens de confirmação foram definidas para os novos destinos; não são apresentadas como cópia das configurações privadas dos originais. A autorização Apps Script não ativa o OAuth somente leitura da aplicação; Supabase institucional criado e schema aplicado: cinco tabelas protegidas, cadastro público desativado. Conexão da aplicação configurada localmente com chave publicável existente. Usuários autorizados do RH, Google Cloud/Forms API e publicação Vercel continuam pendentes. Nenhuma resposta real foi consultada. IDs, links e evidências estão em [CLONAGEM_FORMULARIOS.md](docs/CLONAGEM_FORMULARIOS.md).

## Abrir agora

Requer Node.js 22 ou superior e npm. Dentro desta pasta:

```powershell
npm ci
```

Crie `.env.local` com `APP_DEMO_MODE=true` e inicie:

```powershell
npm run dev
```

Abra [http://127.0.0.1:3000](http://127.0.0.1:3000). O modo demonstração não exige login, não consulta Google ou Supabase e não aceita gravações remotas pelas APIs. Serve para testar cadastros, seleção de pessoas, resultados, configurações e exportações com exemplos fictícios.

## Escopo implementado

- Dashboard com ciclo, participação, pendências de respostas e médias separadas por perspectiva.
- Colaboradores: busca, filtros, seleção, inclusão, edição, desativação e preservação de histórico.
- Detalhe da pessoa com notas, respondentes e evolução por ciclo.
- Avaliações vinculadas aos formulários; leitura de perguntas, mapeamento e sincronização pela API no servidor.
- Resultados identificados, perguntas, distribuição de notas, respondente, pessoa avaliada e data.
- Relatórios com filtros e arquivos PDF e Excel, incluindo planilha de notas por pergunta.
- Configurações de ciclos, participantes, vínculos de liderança e formulários.
- Autenticação por Supabase Auth, autorização explícita do RH e políticas de acesso no banco.

Google Forms continua responsável pela coleta. O sistema não cria formulários nem recebe avaliações digitadas nele. Sem IA, comentários, metas, lembretes ou rankings.

## Formulários reais considerados

Os dois endereços públicos fornecidos foram usados para conhecer e reconstruir a estrutura visível das perguntas nos rascunhos institucionais. Não foram enviadas respostas.

- [Avaliação de líderes](https://docs.google.com/forms/d/e/1FAIpQLSfVn_za-v4FPO_cVEvRx1qds8iaisyDDgnVpl8IAvr7f3lWog/viewform).
- [Avaliação e autoavaliação da equipe](https://docs.google.com/forms/d/e/1FAIpQLSeWB-yAmVclSm7VBeOGot0dlun8Ws9AJS3984WJiEKSTfl8CA/viewform).

Ambos usam escala de **1 a 4**, diferente do exemplo visual inicial de 1 a 5 no PDF. O segundo usa seções por setor e permite avaliar colegas e a própria pessoa. O sistema separa automaticamente as respostas próprias como autoavaliações e mantém as demais como avaliação da equipe, sem presumir que colegas são líderes. Campos textuais de feedback não são importados.

Os esquemas públicos, sem opções com nomes de funcionários nem respostas, estão em `docs/formularios-publicos.json`. Os dados da demonstração são integralmente fictícios.

## Conectar depois da autorização

O passo a passo está em [CONFIGURACAO.md](CONFIGURACAO.md).

A conta Google dedicada é `cadiofit@gmail.com`, proprietária dos dois novos rascunhos. Não é necessário compartilhar os originais: o fluxo público foi conferido e a integração acessará os formulários próprios. O histórico dos originais não foi transferido. Próximos passos estão em [ATIVACAO_GOOGLE.md](docs/ATIVACAO_GOOGLE.md) e responsabilidades em [CONTA_EMPRESA.md](docs/CONTA_EMPRESA.md). Cada pessoa do RH usará seu próprio login no painel.

A ativação seguirá estas etapas:

1. Criar o projeto Supabase, aplicar o esquema e cadastrar as contas individuais autorizadas do RH.
2. Configurar um cliente OAuth Google e habilitar a Forms API.
3. Decidir e conferir as configurações privadas dos rascunhos antes de publicar e distribuir os novos links; autorizar a conta institucional com escopos somente de leitura.
4. Informar os novos IDs de **edição**, registrados em [CLONAGEM_FORMULARIOS.md](docs/CLONAGEM_FORMULARIOS.md), e mapear as novas perguntas. Os IDs publicados `1FAIp...` dos links de preenchimento não são IDs de recurso da Forms API.
5. Cadastrar pessoas, configurar o ciclo, ler as perguntas pela API e mapear identificação, setor e notas.
6. Testar a primeira sincronização com acesso autorizado e publicar na Vercel em modo real.

As credenciais são configuradas em `.env.local` ou nas variáveis privadas da Vercel. Nenhuma chave administrativa do Supabase é necessária no cliente. Arquivos de ambiente e credenciais são ignorados pelo Git.

## Comportamento dos dados

Os vínculos entre pessoa e liderança são registrados no ciclo para preservar a interpretação histórica. A desativação não apaga resultados. Datas, participantes e mapeamentos com respostas existentes não podem ser reinterpretados silenciosamente; crie um novo ciclo ou avaliação para a nova configuração.

A leitura Google percorre todas as páginas. A sincronização usa a última resposta por combinação de formulário, respondente e pessoa avaliada, dentro do período local de São Paulo. Perguntas de seções não respondidas são ignoradas. Nomes ambíguos ou desconhecidos e notas inválidas geram erro de associação, nunca associação por adivinhação. Em uma sincronização com cache existente, respostas rejeitadas preservam o cache anterior para evitar perda de histórico.

O campo “Nome usado no Google Forms”, combinado com o setor, permite associar as opções de nomes já existentes nos formulários. Quando o Google coleta e-mail, ele é o identificador prioritário. Cadastros e aliases precisam ser conferidos pela equipe antes da conexão real. O PDF de colaboradores foi comparado com os formulários; [divergências de nomes, setores e líderes](google-forms/divergencias-colaboradores.md) foram preservadas, sem alterações automáticas.

O total esperado é configurado por formulário e ciclo, pois avaliações entre colegas podem gerar várias respostas por pessoa. Sem uma previsão informada, o painel mostra a quantidade recebida e deixa o percentual e as pendências sem estimativa.

## Validação

```powershell
npm run typecheck
npm test
npm run build
```

Os testes cobrem a API Google com respostas simuladas, identificação, seções condicionais, fusos, duplicidades, validações e autorização. Testes do esquema executam PostgreSQL embarcado via PGlite para verificar políticas de acesso, sincronização transacional e preservação do histórico. Isso não substitui o teste de conexão com o projeto Supabase e os formulários autorizados, pendente da etapa de ativação.

Verificação desta entrega: **66 testes aprovados**, checagem de tipos e compilação de produção concluídas. Sete telas revisadas no navegador em desktop e celular; cadastro, edição, desativação, seleção, busca, persistência e edição de ciclo conferidos. Arquivos PDF/Excel gerados e reabertos nos testes; PDFs individuais, paginados e com nomes longos renderizados e inspecionados. Auditoria das dependências de produção sem vulnerabilidades conhecidas no momento da verificação.

## Estrutura

`src/components`: interface; `src/lib/google`: API e normalização; `src/lib/server`: autenticação, validações e persistência; `src/app/api`: rotas protegidas; `supabase/schemas`: esquema declarativo; `scripts/google-authorize.mjs`: autorização OAuth local; `tests`: verificações automatizadas.

Documentação oficial consultada: [Forms API](https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.responses/list), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Next.js](https://nextjs.org/docs/app/getting-started/installation).


Atualização de ativação — 08/10/2026: conta institucional criada no Supabase Auth e autorizada em rh_users após confirmação explícita. Projeto Google Cloud cardiofitness-avaliacoes criado na conta institucional, Google Forms API ativa, cliente Web Cardiofitness Sistema RH Local criado com retorno http://127.0.0.1:42813/oauth2callback e escopos forms.body.readonly / forms.responses.readonly. Aplicativo em Testing. Segredo do cliente ainda não configurado: tentativa de download pelo navegador não disponibilizou arquivo. Google não permite recuperar segredo já oculto; responsável deverá localizar o download ou criar/adicionar novo segredo diretamente e salvá-lo localmente. Nenhuma autorização OAuth da aplicação concedida, token persistente obtido ou resposta privada lida. Publicação Vercel pendente.

## Login atualizado — 08/10/2026

Tela Cardiofitness com e-mail/senha e Google. Acesso exige vínculo RH. Google implementado, ainda não ativado no provedor; Forms aguarda correção da credencial local. Consulte [LOGIN.md](docs/LOGIN.md) para estado verificado e ativação.


Atualização confirmada — 08/10/2026: credencial Forms corrigida, OAuth concluído e token persistente salvo exclusivamente em .env.local. Leitura dos dois destinos pela API aprovada (17 e 83 itens, incluindo seções). Nenhuma resposta consultada. Google Login no Supabase continua pendente; não confundir com a conexão Forms. Aplicativo Google em Testing: revisar duração da autorização antes da produção.


Atualização — 08/10/2026: Google Login ativado e entrada real da conta RH validada até o Dashboard. Forms API também conectada. Banco ainda sem colaboradores/ciclos/avaliações. Ver docs/LOGIN.md para estado atual; etapas antigas de ativação já foram concluídas.
