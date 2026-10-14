# Acessos individuais do RH

Aplicar `supabase/schemas/07_rh_management.sql` prepara a gestão de acessos sem promover nenhuma conta existente. O acesso atual de RH permanece igual.

A primeira conta administradora exige autorização explícita. Essa autorização foi concedida e aplicada em 14/10/2026: cadiofit@gmail.com já possui administração dos acessos do RH. O arquivo supabase/authorize-first-rh-admin.sql registra a concessão inicial.

Em Configurações, administradores podem autorizar uma conta já existente no Supabase Auth, alterar o perfil entre RH e administrador e revogar o acesso ao painel. A conta precisa ser provisionada no Supabase antes; esta funcionalidade não envia convite nem cria senha. Não é permitido alterar o próprio acesso ou remover o último administrador.

O servidor verifica a sessão, a troca obrigatória da senha e a permissão administrativa registrada no banco. Metadados editáveis pelo usuário não concedem acesso. A chave privada permanece no servidor. Alterações são serializadas e registradas em histórico com responsável, conta afetada, ação e horário. Usuários comuns não podem escrever diretamente na tabela de autorizações ou no histórico.

Revogar remove a autorização de RH e bloqueia as próximas consultas e alterações mesmo que a pessoa ainda tenha sessão de autenticação. Não apaga a conta de login, avaliações, colaboradores ou históricos.

