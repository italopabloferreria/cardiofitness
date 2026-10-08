# Acesso ao RH — 08/10/2026

Sistema: https://cardiofitness-smoky.vercel.app. Conta institucional: cadiofit@gmail.com. Login Google validado em produção. E-mail/senha habilitado; responsável confirmou alteração manual da senha. Senha do sistema é independente do Gmail. Nenhuma senha é registrada neste documento.

Ambos os métodos exigem vínculo RH pelo UUID. Cadastro público e acesso anônimo desativados. Banco contém 33 cadastros oficiais do PDF do RH; colaboradores não recebem acesso administrativo automaticamente.

## Recuperação

Clique em “Esqueci minha senha”, informe o e-mail cadastrado e abra o link recebido no mesmo navegador. Defina e confirme nova senha com pelo menos 12 caracteres e até 72 bytes; entre novamente. Link inválido/expirado exige nova solicitação. Reenvio respeita espera de 60 segundos e limites do Supabase. Entrega real ainda precisa ser conferida pelo responsável.

Supabase Site URL de produção configurada. Retornos exatos autorizados: /auth/callback e /auth/recovery nos domínios http://127.0.0.1:3000 e https://cardiofitness-smoky.vercel.app. APP_URL deve corresponder ao ambiente.

## Alteração e primeiro acesso

Configurações → Minha conta exige senha atual, nova senha e confirmação. Marca administrativa must_change_password bloqueia dados no servidor e RLS, inclusive sessão Google; trigger remove a marca somente após mudança real do hash. Migração 02 aplicada. Nenhuma credencial provisória faz parte da publicação. Preservar senha definida manualmente pelo responsável.

## Operação

Forms API usa autorização de leitura independente do login Google. App Google em Testing exige revisão para uso contínuo. E-mail padrão Supabase tem restrições; SMTP próprio necessário antes de ampliar destinatários RH. Ver AUDITORIA_PRELIMINAR.md para evidências e homologação pendente.
