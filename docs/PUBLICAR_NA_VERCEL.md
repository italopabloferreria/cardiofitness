# Publicação na Vercel

Estado em 08/10/2026: cópia sanitizada publicada no repositório privado https://github.com/italopabloferreria/cardiofitness, branch `main`, commit `26bb748`. Typecheck, build e 94 testes passaram; a Vercel ainda não foi configurada porque a CLI está sem autenticação. Isso não substitui a homologação do fluxo real de coleta.

1. O repositório privado já foi criado e contém a cópia sanitizada como raiz (onde está `package.json`). Não enviar `.env.local` ou credenciais; `.gitignore` já os exclui. O repositório não contém os arquivos de ambiente locais.
2. Importar repositório na Vercel, selecionar Next.js e manter comandos padrão. Caso envie a pasta externa inteira, configurar Root Directory para a pasta que contém package.json.
3. Configurar variáveis da produção: APP_DEMO_MODE=false; NEXT_PUBLIC_SUPABASE_URL; NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; GOOGLE_CLIENT_ID; GOOGLE_CLIENT_SECRET; GOOGLE_REFRESH_TOKEN; GOOGLE_LOGIN_ENABLED=true. Usar valores privados já configurados localmente, nunca copiá-los para GitHub. APP_URL deve ser a origem HTTPS definitiva, sem caminho, não localhost.
4. No Supabase Authentication → URL Configuration, definir Site URL para a origem definitiva e permitir o retorno exato https://SEU_DOMINIO/auth/callback. O retorno Google → Supabase já configurado continua https://crqzpadgqbjszywfeuip.supabase.co/auth/v1/callback. Não substituir esse endereço pelo retorno do painel.
5. Publicar novamente após ajustar variáveis. Verificar Google login, e-mail/senha, acesso RH e bloqueio de usuários não autorizados no domínio definitivo.
6. Revisar publicação/validação do OAuth Google para operação contínua. O projeto está em Testing e o refresh token com escopos Forms pode expirar em sete dias. Depois de ajustar a situação, renovar a autorização Forms conforme necessário e atualizar token privado na Vercel.
7. Homologar primeiro ciclo, identificação, sincronização real e exportações com o RH antes de uso operacional.

O deploy pode servir a interface antes de tudo estar homologado. Subir código no GitHub, por si só, não configura as conexões de produção. O servidor local pode ser desligado depois que a aplicação na Vercel tiver configuração e validação concluídas.

Referências oficiais: https://supabase.com/docs/guides/auth/redirect-urls ; https://vercel.com/docs/environment-variables ; https://developers.google.com/identity/protocols/oauth2
