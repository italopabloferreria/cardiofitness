# Ativar Google Forms

**Conta institucional:** `cadiofit@gmail.com`, exatamente com essa grafia, proprietária dos dois rascunhos recriados. Os rascunhos têm o fluxo público conferido: 63 perguntas, três seções de Líderes e oito de Equipe. Os 12 caminhos de setor × Sim/Não foram percorridos nos originais sem enviar respostas. Escalas 1–4: sete de Líderes sem rótulos nas pontas e 31 de Equipe com “Abaixo do esperado” / “Alto desempenho”. Finais, rotas e tema foram reproduzidos; ambos permanecem rascunhos não publicados.

As configurações dos novos formulários foram definidas e conferidas após autorização de Ítalo: identificação declarada por nome e setor, sem coleta adicional de e-mail, vários envios permitidos, edição após envio desativada, resumo dos resultados oculto, barra de progresso e link para outra resposta ativos. Edição e respostas permanecem restritas à conta institucional proprietária. As mensagens de confirmação foram definidas para os novos destinos; não são apresentadas como cópia das configurações privadas dos originais. IDs, links e evidências estão em [CLONAGEM_FORMULARIOS.md](CLONAGEM_FORMULARIOS.md). Google Cloud/Forms API e OAuth somente leitura do sistema continuam pendentes; consentimento Apps Script não ativa essa integração. Este roteiro não consulta respostas.

## 1. Revisar configurações e cadastros dos rascunhos próprios

Usar os dois IDs de edição registrados em [CLONAGEM_FORMULARIOS.md](CLONAGEM_FORMULARIOS.md). Perguntas, grupos, alternativas, obrigatoriedade, escalas, finais, 12 caminhos públicos e tema foram conferidos. Não é necessário compartilhar os originais. As configurações de coleta estão definidas; valide os cadastros antes de publicar e distribuir links. Os destinos têm novos IDs de perguntas e não recebem o histórico dos originais. Consulte [divergencias-colaboradores.md](../google-forms/divergencias-colaboradores.md) para validar nomes, setores, líderes e aliases; a comparação com o PDF não alterou os formulários.

## 2. Criar projeto e habilitar a API

Entrar no [Google Cloud Console](https://console.cloud.google.com/) com a conta institucional. Criar um projeto sob controle da Cardiofitness; nome sugerido: **Cardiofitness Avaliações**. Com esse projeto selecionado, abrir **APIs e serviços → Biblioteca**, procurar **Google Forms API** e habilitar. Criar Gmail não executa essas etapas. [Criar projeto Google Cloud](https://developers.google.com/workspace/guides/create-project), [habilitar APIs](https://developers.google.com/workspace/guides/enable-apis).

## 3. Configurar consentimento OAuth

Em **Google Auth Platform → Branding**, iniciar a configuração, informar nome do aplicativo e contatos controlados pela empresa. Em **Audience**, usar **External/Externo** para a conta Gmail e adicionar `cadiofit@gmail.com` em **Test users/Usuários de teste**. Em **Data Access/Acesso a dados**, adicionar somente:

- `https://www.googleapis.com/auth/forms.body.readonly`
- `https://www.googleapis.com/auth/forms.responses.readonly`

São os dois escopos implementados: leitura de perguntas e respostas. O responsável revisa políticas e confirma os termos diretamente no Google. [Consentimento e escopos](https://developers.google.com/workspace/guides/configure-oauth-consent), [público do aplicativo](https://support.google.com/cloud/answer/15549945?hl=en).

## 4. Criar cliente OAuth compatível com o roteiro local

Em **Google Auth Platform → Clients → Create Client**, escolher **Web application/Aplicativo da Web**. Em **Authorized redirect URIs/URIs de redirecionamento autorizados**, registrar exatamente:

`http://127.0.0.1:42813/oauth2callback`

Esse endereço é o retorno do script local; não substituí-lo pela porta 3000 ou pelo futuro domínio Vercel. Guardar o ID e o segredo do cliente diretamente em `.env.local`, nas variáveis `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`. Não enviar valores no chat. [Criar cliente OAuth](https://developers.google.com/workspace/guides/create-credentials).

## 5. Autorizar a conta institucional

Depois das etapas anteriores, executar na pasta do sistema:

```powershell
npm run google:authorize
```

O responsável escolhe `cadiofit@gmail.com` no navegador, realiza login/2FA se solicitado e revisa o consentimento. O script usa PKCE e estado de segurança, não lê os formulários e salva o token apenas em `.env.local`, sem imprimi-lo. Senhas, códigos e termos são tratados pelo responsável diretamente nas telas Google.

Aplicativos externos em **Testing** recebem tokens de renovação que expiram em **sete dias** para estes escopos. Antes de operação contínua, revisar publicação e eventuais exigências de verificação; autorização de teste não significa integração pronta para produção. [Expiração de tokens OAuth](https://developers.google.com/identity/protocols/oauth2#expiration).

## Estado atual — 08/10/2026

Projeto Cloud, Forms API, cliente Web e usuário de teste configurados. Supabase conectado e conta institucional autorizada no RH. Consentimento de leitura autorizado pelo responsável; troca de código falhou com invalid_client porque a chave local não corresponde às chaves ativas. Nenhum token persistente obtido ou resposta privada lida.

Corrigir GOOGLE_CLIENT_SECRET localmente, repetir autorização e conferir leitura/mapeamento antes da primeira sincronização. Formulários continuam não publicados. Google Login é outra configuração: ver [LOGIN.md](LOGIN.md). Publicação Vercel pendente.


Atualização confirmada — 08/10/2026: credencial Forms corrigida, OAuth concluído e token persistente salvo exclusivamente em .env.local. Leitura dos dois destinos pela API aprovada (17 e 83 itens, incluindo seções). Nenhuma resposta consultada. Google Login no Supabase continua pendente; não confundir com a conexão Forms. Aplicativo Google em Testing: revisar duração da autorização antes da produção.
