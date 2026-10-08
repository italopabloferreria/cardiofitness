# Acesso ao RH — estado em 08/10/2026

E-mail/senha e Google implementados. Google ativado no Supabase e login real de cadiofit@gmail.com aprovado até o Dashboard, com vínculo RH existente. Login por senha preservado e habilitado no Supabase; conferência manual da senha ainda pendente. A senha do painel é a definida no Supabase Auth, não a senha Gmail.

Cadastro público, acesso anônimo, vinculação manual, ignorar nonce e contas sem e-mail permanecem desativados. Ambos os métodos exigem vínculo rh_users por ID; não há concessão automática de RH por e-mail.

Após confirmação explícita do responsável, cliente Google existente reutilizado. Retornos Google autorizados: http://127.0.0.1:42813/oauth2callback (Forms local) e https://crqzpadgqbjszywfeuip.supabase.co/auth/v1/callback (login via Supabase). Credencial salva nos campos oficiais do provedor. Nenhum segredo neste documento ou pacote fonte.

APP_URL local: http://127.0.0.1:3000. Supabase Site URL igual e retorno exato http://127.0.0.1:3000/auth/callback autorizado. GOOGLE_LOGIN_ENABLED=true somente em .env.local desta instalação. Novo ambiente deve habilitar após configurar provedor/retornos.

Forms API conectada, token persistente salvo exclusivamente em .env.local. Metadados dos dois destinos lidos com sucesso. Login Google solicita identidade; leitura Forms usa autorização independente. Aplicativo Google em Testing: revisar publicação e duração do token antes da produção.

## Para Vercel

Configurar variáveis do servidor fora do código/pacote. Definir APP_URL como domínio real HTTPS da publicação. Atualizar Site URL e autorizar https://DOMINIO-REAL/auth/callback no Supabase. Retorno Google permanece o endpoint Supabase já cadastrado. Testar os dois métodos após publicar. Não usar domínio inventado ou permitir retornos genéricos.

## Operação pendente

Banco real ainda sem colaboradores, ciclos ou avaliações. Validar lista de pessoas/vínculos, período e participantes do primeiro ciclo; mapear formulários, publicar coleta quando autorizada e conferir sincronização. Não foram criados dados fictícios no banco real.


Atualização — cadastro aplicado: PDF enviado pelo responsável importado em 08/10/2026. Total 33 registros: 28 colaboradores vinculados a cinco líderes. Nomes e setores preservados; e-mails ausentes mantidos vazios. CLEUMA atende dois setores, ambos registrados no seu departamento. Cadastro inicial ativo; nenhuma conta de acesso criada para colaboradores. Sem aliases presumidos entre PDF e Forms. Ciclos e avaliações ainda não cadastrados; falta período do primeiro ciclo.


Mapeamento preparado — 08/10/2026: atalhos do painel agora usam IDs e links dos novos formulários da conta institucional. Ao vincular, preenchem perguntas de identificação, setor e notas: sete escalas de líderes e 31 da equipe, com cinco pares de identificação por seção. Campos de feedback não selecionados. Conferido com metadados atuais da Forms API. Datas do ciclo e aliases de pessoas ainda pendentes; nenhuma avaliação/ciclo criado por suposição.


## Senha própria e primeiro acesso — 08/10/2026

Login por Google e e-mail/senha mantidos. Configurações → Minha conta permite trocar a própria senha, verificando senha atual, confirmação e nova senha diferente com mínimo de 12 caracteres (limite do provedor: 72 bytes). Nenhuma senha é exibida, registrada ou incluída no pacote.

Migração `supabase/schemas/02_password_first_access.sql` aplicada ao projeto real. Cria verificação obrigatória no servidor e políticas restritivas nas quatro tabelas de negócio. A marca administrativa `raw_app_meta_data.must_change_password` não é alterável pelo usuário. Um trigger retira a marca somente quando o hash da senha realmente muda; atualizar outros dados não libera acesso. A verificação lê o banco, evitando liberação por JWT antigo. A restrição vale também para sessão Google enquanto marcada.

Ativação da senha provisória pendente de ação humana: administrador deve pessoalmente definir senha temporária individual no Supabase Authentication. Depois executar `supabase/exigir-troca-senha-rh.sql` para a conta institucional existente. Para outras contas, adaptar exclusivamente o UUID após autorização RH. Não usar senha padrão compartilhada. A senha atual não foi substituída; não foi cadastrada `admin123`. A política do navegador exige que o usuário faça entrada e submissão de novas credenciais.

94 testes aprovados, incluindo bloqueio RLS direto, hash inalterado mantendo restrição, troca real removendo somente a marca e erros sem credenciais. Build aprovado. Tela Minha conta verificada autenticada; alteração de senha real não executada pelo agente.
