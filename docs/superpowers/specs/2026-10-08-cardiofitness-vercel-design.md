# Cardiofitness: repositório e publicação na Vercel

**Data:** 2026-10-08  
**Status:** Especificação aprovada para revisão do usuário  
**Origem:** `cardiofitness-avaliacoes`  
**Destino local:** `outputs\cardiofitness`  
**Repositório GitHub:** repositório privado pessoal `cardiofitness`

## Objetivo

Preparar a aplicação existente de avaliações para uso pelo RH por meio de um
repositório GitHub privado e uma implantação Next.js na Vercel. A preparação
deve conservar as funcionalidades já entregues — Dashboard, Colaboradores,
Detalhe, Avaliações Google Forms, Resultados, Relatórios PDF/Excel e
Configurações — sem introduzir funcionalidades fora do escopo, como IA,
comentários, metas, lembretes, rankings ou criação/preenchimento de
formulários.

Esta etapa produzirá somente a especificação. A cópia, validação, publicação e
implantação ocorrerão em uma etapa posterior, após a revisão deste documento.

## Decisões e limites

- A origem é a pasta atual `cardiofitness-avaliacoes`; a pasta de trabalho
  publicada será `outputs\cardiofitness`.
- O repositório GitHub será privado e terá o nome `cardiofitness`.
- A branch principal será `main`.
- O projeto será importado na Vercel como aplicação Next.js, usando o build
  existente (`npm run build`) e Node.js 22 ou superior.
- O modo demonstração só pode ser ativado deliberadamente com
  `APP_DEMO_MODE=true` e usa exclusivamente dados fictícios locais.
- Em produção, `APP_DEMO_MODE=false`; ausência de credenciais não pode virar
  acesso irrestrito. O acesso real continua limitado a usuários autenticados
  e autorizados pelo Supabase/RH.
- Google Forms permanece apenas como fonte de coleta. A integração do servidor
  é somente leitura, com validação, paginação, deduplicação, identificação
  inequívoca e erros seguros.
- Credenciais, tokens, segredos administrativos e arquivos de ambiente locais
  nunca entram no repositório nem em artefatos de build.
- Não há projeto Supabase novo a provisionar nesta etapa. O esquema existente e
  suas instruções serão preservados; conexão real só será afirmada depois de
  verificação efetiva.

## Arquitetura de publicação

### Artefato de origem e cópia sanitizada

Será criada uma cópia da aplicação no destino definido, sem alterar a origem
durante a preparação. A cópia manterá `src`, `public`, `supabase`, `google-forms`,
`tests`, `scripts`, `docs`, `package.json`, `package-lock.json`, configurações
TypeScript/Next.js e documentação operacional.

Serão excluídos da cópia versionada:

- `.env.local` e qualquer outro `.env` concreto;
- `node_modules`;
- `.next`, `coverage`, relatórios de teste e demais caches/artefatos gerados;
- `tsconfig.tsbuildinfo`;
- tokens, credenciais OAuth, chaves privadas e arquivos `credentials*.json`,
  `tokens*.json` ou equivalentes;
- qualquer arquivo identificado na revisão como contendo segredo.

`.env.example` será preservado como contrato de configuração sem valores
secretos. O `.gitignore` será conferido antes do primeiro commit para impedir
que arquivos sensíveis sejam adicionados posteriormente.

### Execução na Vercel

A Vercel será conectada ao repositório privado `cardiofitness`. O projeto usará
o comportamento padrão de uma aplicação Next.js, sem exportação estática, para
manter rotas de servidor, autenticação, leitura do Google Forms e geração de
PDF/Excel.

As variáveis de ambiente serão cadastradas diretamente na Vercel, separadas por
ambiente quando aplicável:

- `APP_DEMO_MODE=false`;
- URL e chave publicável do Supabase;
- `APP_URL` com o domínio HTTPS final;
- credenciais OAuth/serviço Google necessárias somente no servidor;
- configuração de login Google, quando efetivamente habilitada.

Nenhum segredo será colocado em `NEXT_PUBLIC_*`. A implantação não será
considerada pronta apenas por gerar uma URL: será necessário verificar o
domínio, o login do RH, a autorização, a leitura controlada dos formulários e
as exportações.

## Fluxo de dados e segurança

1. O navegador acessa a aplicação publicada e inicia autenticação pelo
   Supabase.
2. As políticas do Supabase e a associação explícita em `rh_users` continuam
   sendo a autorização real do RH; cadastro público ou ausência de configuração
   não concede acesso.
3. Rotas de servidor usam as variáveis privadas e os clientes já existentes.
   O Google Forms é consultado somente no servidor, com escopos de leitura.
4. Respostas são normalizadas nos contratos compartilhados de
   `src/lib/types.ts`, associadas sem adivinhação e armazenadas no cache
   normalizado do Supabase sem importar conteúdo textual de feedback.
5. Falhas de credencial, autorização, validação, paginação ou associação são
   expostas como erros seguros e não substituem dados reais por demonstração.
   Uma sincronização inválida preserva o cache anterior conforme o
   comportamento já documentado.

## Sequência de entrega

### 1. Sanitizar e validar localmente

Copiar a aplicação para `outputs\cardiofitness`, remover apenas os itens
sensíveis/gerados listados acima, revisar o conteúdo versionável e instalar
dependências de forma reprodutível com `npm ci`.

Executar, na cópia:

```powershell
npm run typecheck
npm test
npm run build
```

Também será feita uma revisão funcional/visual no navegador, incluindo login ou
modo demo explicitamente configurado, navegação principal e geração de PDF e
Excel. Falhas serão corrigidas antes de qualquer publicação.

### 2. Criar e publicar o repositório Git

Inicializar Git apenas dentro de `outputs\cardiofitness`, configurar a branch
`main`, revisar `git status` e confirmar que nenhum segredo ou artefato foi
selecionado. Criar o repositório GitHub privado pessoal `cardiofitness`,
adicionar o remoto, criar um commit inicial contendo a aplicação sanitizada e
enviar `main`.

A criação e o push dependerão de autenticação GitHub disponível. Sem
autenticação, a etapa deve parar com erro explícito, sem criar um repositório
público ou usar credenciais embutidas.

### 3. Conectar e publicar na Vercel

Importar o repositório privado na conta Vercel autorizada, confirmar o
framework Next.js e configurar as variáveis privadas. Executar um deploy de
produção somente depois de validar as variáveis e a origem do repositório.

Se a autenticação Vercel não estiver disponível, deixar a preparação local e o
repositório GitHub concluídos (se autorizados), registrar a Vercel como
pendente e não alegar implantação realizada.

### 4. Aceite pós-publicação

Considerar a entrega operacional somente se todos os itens abaixo forem
confirmados no domínio publicado:

- `APP_DEMO_MODE=false` e nenhuma credencial aparece no cliente, logs ou
  repositório;
- visitante não autenticado não obtém dados de RH;
- usuário autenticado sem vínculo RH não obtém dados protegidos;
- usuário RH consegue entrar, carregar o Dashboard e navegar pelas telas;
- sincronização Google Forms usa leitura autorizada e preserva erros/cache com
  segurança;
- resultados, filtros e exportações PDF/Excel funcionam;
- build de produção é reproduzível a partir do lockfile;
- documentação de configuração continua coerente com o ambiente publicado.

## Escopo fora desta entrega

Não criar projeto Supabase pago, não publicar formulários Google, não consultar
respostas reais sem autorização, não migrar dados históricos, não alterar o
modelo funcional da aplicação e não adicionar comentários, IA, metas,
lembretes, rankings ou entrada de avaliações no sistema.

## Critério de conclusão da preparação

A preparação inicial termina quando existir uma cópia sanitizada em
`outputs\cardiofitness`, os comandos de validação passarem, o repositório
privado `cardiofitness` estiver em `main` e a Vercel estiver publicada com
verificação funcional. Qualquer item bloqueado por autenticação ou por
credencial ausente será marcado como pendente, nunca apresentado como
concluído.

