# Supabase institucional verificado — 08/10/2026

Projeto crqzpadgqbjszywfeuip, existente e preservado. Auditoria somente leitura confirmou:

- 33 pessoas: cinco líderes, 28 colaboradores e 28 vínculos de liderança.
- Uma associação RH autorizada.
- Zero ciclos, avaliações e respostas. Nenhum dado de demonstração importado.
- RLS nas cinco tabelas; anon sem permissão SELECT em employees.
- Quatro políticas restritivas de troca de senha e trigger de alteração do hash presentes.
- Conexão local APP_DEMO_MODE=false e GOOGLE_LOGIN_ENABLED=true.
- Token Google atual autorizou leitura dos metadados dos dois Forms existentes, sem ler respostas.

Google Forms líderes:
https://docs.google.com/forms/d/e/1FAIpQLScI5us346mhyabPreE4ly7CXXZYBn5wwYBbXj6HJOGHErDpYQ/viewform

Google Forms equipe e autoavaliação:
https://docs.google.com/forms/d/e/1FAIpQLSeoKb2fBDMF0te3XNKtp22Gy_oZifnCTER3sSOVvuarDOs-sQ/viewform

IDs de edição confirmados pela Forms API e correspondências em src/lib/form-presets.ts. Os dois links enviados na última mensagem do usuário são iguais ao formulário de líderes; não substituir o de equipe por esse duplicado.

Não reaplicar schema base, não recriar projeto e não executar importação automática ao publicar. O deploy aponta ao mesmo Supabase, conserva cadastros e usa RLS da conta autenticada. As credenciais privadas precisam ser configuradas na Vercel, fora do Git.

Pendente: listas de coleta alinhadas ao PDF oficial, publicação dos Forms, primeiro ciclo, sincronização real; revisão OAuth Testing e entrega real de recuperação. Auditoria do banco não representa conclusão dessas etapas. Responsável confirmou alteração manual da senha.

Login Google revalidado nesta entrega após salvar novamente o callback exato no cliente Google: retorno ao painel e leitura dos 33 cadastros pelo RH confirmados.
Validação do código: 138 testes e build de produção aprovados.
