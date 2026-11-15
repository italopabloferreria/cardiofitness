# Cardiofitness — Avaliações do RH

Sistema Next.js de avaliações bimestrais, conectado ao Supabase institucional e à Google Forms API somente para leitura. Dashboard, colaboradores, detalhe individual, ciclos, avaliações, resultados, relatórios PDF/Excel e configurações. Login Google e e-mail/senha; alteração de senha em Minha conta.

## Dados e acesso

Produção usa exclusivamente os cadastros do RH já existentes no Supabase: 28 colaboradores e cinco líderes. Não há seed automático. Cadastros do sistema não criam usuários de login. Todas as tabelas têm RLS; acesso exige conta autorizada em rh_users. A conexão usa chave publicável com sessão do RH, nunca service_role no navegador.

APP_DEMO_MODE=false no ambiente real e em vercel.json. As fixtures de testes e o modo de demonstração opcional não são importados no Supabase. Não execute scripts de testes ou cadastros fictícios contra produção. Não reaplique o esquema base nem a importação do PDF no projeto já configurado.

## Rodar localmente

Node.js 22 ou superior. Execute npm ci. Copie .env.example para .env.local e configure variáveis institucionalmente; mantenha APP_DEMO_MODE=false. Execute npm run dev. Endereço: http://127.0.0.1:3000.

O arquivo .env.local contém credenciais privadas e não entra no Git. Para a Vercel, configure as variáveis na plataforma, APP_URL com o domínio HTTPS e os retornos de login no Supabase. Consulte [publicação](docs/PUBLICAR_NA_VERCEL.md).

## Forms por ciclo

Cole o link de preenchimento ou edição no editor da avaliação. Os dois formulários conferidos preenchem ID da API e mapeamento. Outro link público exige também o link/ID de edição, acesso de leitura da conta institucional e mapeamento das perguntas. Ler perguntas confirma acesso à API. Sincronizar lê respostas, cruza identificação com participantes/vínculos e filtra pelo período do ciclo. Não existe escrita nas listas do Forms nem sincronização agendada.

[Guia do RH](docs/GUIA_DO_RH.md) · [Estado da ativação](docs/PRONTO_PARA_ATIVAR.md) · [Login](docs/LOGIN.md)

## Verificação

npm run typecheck
npm test
npm run build

O primeiro ciclo, publicação da coleta e sincronização real devem ser homologados com o RH. A senha provisória e a marca de troca obrigatória ainda não foram ativadas; a infraestrutura correspondente está implementada.

## Cardiofitness 2.0 — portal nativo (prévia)

O próximo sistema usará **um único endereço /avaliar** que muda as avaliações pelo ciclo, sem gerar novos links. O projeto inclui duas prévias com **dados fictícios e sem gravação**:

- [Prévia da avaliação para colaborador/líder](/preview/avaliar)
- [Prévia do novo dashboard do RH](/preview/rh)

A arquitetura, cronograma e migração segura estão em [docs/ARQUITETURA_PORTAL_NATIVO.md](docs/ARQUITETURA_PORTAL_NATIVO.md). **Ainda não existe coleta nativa funcional**; o Google Forms atual e os registros legados permanecem intocados.
