# Conta da empresa e ativação

**Decisão inicial de 7 de outubro de 2026:** preparar agora; criar e conectar depois. A empresa encarregou Ítalo de criar uma conta Google dedicada à integração, sem depender da conta pessoal de alguém do RH.

**Estado atual:** Dois formulários recriados na conta `cadiofit@gmail.com` têm o fluxo público conferido: 63 perguntas, três seções de Líderes e oito de Equipe. Os 12 caminhos de setor × Sim/Não foram percorridos nos originais sem enviar respostas. Escalas 1–4: sete de Líderes sem rótulos nas pontas e 31 de Equipe com “Abaixo do esperado” / “Alto desempenho”. Finais, rotas e tema foram reproduzidos; ambos permanecem rascunhos não publicados.

As configurações dos novos formulários foram definidas e conferidas após autorização de Ítalo: identificação declarada por nome e setor, sem coleta adicional de e-mail, vários envios permitidos, edição após envio desativada, resumo dos resultados oculto, barra de progresso e link para outra resposta ativos. Edição e respostas permanecem restritas à conta institucional proprietária. As mensagens de confirmação foram definidas para os novos destinos; não são apresentadas como cópia das configurações privadas dos originais. IDs, links e evidências estão em [CLONAGEM_FORMULARIOS.md](CLONAGEM_FORMULARIOS.md). Google Cloud/Forms API, OAuth somente leitura do sistema, Supabase e publicação Vercel continuam pendentes; a autorização Apps Script não os substitui. Nenhuma resposta real foi consultada. Próximos passos em [ATIVACAO_GOOGLE.md](ATIVACAO_GOOGLE.md).

## Conta sob controle da Cardiofitness

Ítalo informou a criação da conta institucional. Registrar quem responde por ela e manter recuperação sob controle da empresa. Gmail é um serviço da conta Google; criar o endereço não habilita a Forms API nem cria os outros projetos. [Informações oficiais sobre contas Google](https://support.google.com/accounts/answer/27441?hl=pt-BR).

O responsável mantém senha, verificações e termos diretamente no Google. Confirmar a [verificação em duas etapas](https://support.google.com/accounts/answer/185839?hl=pt-BR) e guardar os meios de recuperação no gerenciador de senhas da empresa. Senha, códigos e chaves não devem ser enviados no chat ou incluídos nos arquivos entregues. A senha dessa conta não será distribuída aos usuários do sistema.

## Rascunhos da conta institucional

A decisão atual é usar as recriações da conta institucional, ainda não publicadas. Elas têm novos IDs e começarão sem o histórico dos originais. O fluxo público e o tema foram reproduzidos; não é necessário compartilhar os originais. Decidir e validar as configurações privadas antes de distribuir os novos links de coleta. Diferenças entre o PDF de colaboradores e os formulários estão em [divergencias-colaboradores.md](../google-forms/divergencias-colaboradores.md), sem substituições automáticas de nomes ou vínculos.

O acesso de edição concedido no Google e os escopos usados pela aplicação são coisas diferentes. O código solicita apenas `forms.body.readonly` para perguntas e `forms.responses.readonly` para respostas; não altera o formulário. [Leitura do formulário](https://developers.google.com/workspace/forms/api/reference/rest/v1/forms/get), [leitura das respostas](https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.responses/list).

Há duas modalidades já implementadas:

- **OAuth, caminho principal:** configurar o projeto Google Cloud da integração, habilitar a Forms API, configurar consentimento/cliente e autorizar a conta dedicada proprietária dos rascunhos. O roteiro [CONFIGURACAO.md](../CONFIGURACAO.md) inclui o comando que guarda o token em `.env.local`. O consentimento Apps Script já concedido não ativa esse OAuth.
- **Conta de serviço, alternativa:** criar uma identidade técnica no projeto Google Cloud e compartilhar cada formulário com o e-mail dessa identidade. Ela não é uma caixa Gmail. Permissões no Google Cloud não concedem acesso aos formulários automaticamente; compartilhar arquivos específicos dispensa delegação ampla de domínio para esse caso. As duas variáveis de conta de serviço substituem as três variáveis OAuth; escolher uma modalidade. [Credenciais e compartilhamento direto](https://developers.google.com/workspace/guides/create-credentials).

## Acesso individual do RH

O Gmail de integração não será o login compartilhado do painel. Cada pessoa autorizada terá e-mail e senha próprios no **Supabase Auth**, com cadastro individual em `rh_users`. Criar a identidade de integração não concede acesso ao RH. O sistema atual usa login por e-mail/senha, sem exigir Gmail dos usuários; todos os membros autorizados têm o mesmo escopo de RH. A autorização é verificada no servidor e nas políticas do banco. [Usuários e proteção de dados no Supabase](https://supabase.com/docs/guides/auth/managing-user-data).

Projetos Supabase e Vercel deverão ficar sob controle da Cardiofitness, com responsáveis identificados e acesso administrativo individual. O responsável pela infraestrutura pode ser diferente dos usuários do painel. [Gestão de contas e equipes na Vercel](https://vercel.com/docs/accounts).

## Checklist que ainda aguarda produção

- [ ] Confirmar responsável, recuperação e 2FA de `cadiofit@gmail.com`; a sessão institucional e seus dois rascunhos já foram conferidos no navegador.
- [x] Definir e conferir configurações de coleta dos dois destinos.
- [ ] Validar cadastros e aliases antes de publicar e distribuir os novos links. Fluxo público e tema já conferidos; IDs em [CLONAGEM_FORMULARIOS.md](CLONAGEM_FORMULARIOS.md).
- [ ] Criar o projeto Google Cloud, habilitar Forms API e concluir OAuth **ou** configurar a conta de serviço autorizada; validar condições de uso contínuo do OAuth.
- [ ] Criar Supabase, aplicar o esquema e cadastrar/autorizar individualmente o RH, com inscrições públicas desativadas.
- [ ] Configurar pessoas, aliases, setores, ciclo, vínculos, perguntas e escala 1–4; conferir a primeira sincronização contra os formulários.
- [ ] Criar o repositório e projeto Vercel sob controle da empresa; configurar variáveis privadas, domínio HTTPS e `APP_DEMO_MODE=false`.
- [ ] Validar no ambiente real login/logout, bloqueio de usuários não autorizados, acesso aos dois formulários, sincronização e relatórios; liberar o uso após essa conferência.

Passo a passo técnico: [CONFIGURACAO.md](../CONFIGURACAO.md). Fontes oficiais consultadas em 7 de outubro de 2026.
