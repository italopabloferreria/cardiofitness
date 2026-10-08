# Ativação Cardiofitness

Implementado e conectado: painel RH, login Google validado, e-mail/senha habilitado, Supabase com acesso restrito, 28 colaboradores e cinco líderes cadastrados, Forms API com leitura autorizada e dois presets com perguntas reais. Ciclos são bimestrais: RH escolhe início e o encerramento é sugerido automaticamente para dois meses; ajuste permitido antes de resultados. Datas de teste foram descartadas. Nenhum ciclo real foi criado por suposição.

## Operação e publicação pendentes

- RH iniciar o primeiro ciclo e escolher participantes pelo painel.
- PDF do RH confirmado como fonte oficial: nomes, setores e lideranças já importados prevalecem. As listas antigas dos Forms são desconsideradas como cadastro. Alinhar identificação da coleta ao PDF antes de sincronizar; nenhum alias ou identidade é criado por aproximação.
- Vincular os presets ao ciclo e conferir identificação/perguntas antes de sincronizar.
- Formulários continuam rascunhos: publicar coleta quando a empresa decidir iniciar.
- Conferir login por senha com senha definida pelo responsável no Supabase.
- Publicar na Vercel com variáveis privadas configuradas e APP_URL/retorno Supabase do domínio definitivo.
- Revisar OAuth Google em Testing antes da operação contínua (token Forms pode expirar em sete dias).

Validação: TypeScript, build de produção e 85 testes aprovados em 08/10/2026. Na interface autenticada, entrada por teclado confirmou cálculo de dois meses. Nenhuma resposta privada ou avaliação de teste enviada; banco sem ciclos/avaliações fictícias. Exportações e normalização testadas com fixtures locais; sincronização real ainda exige primeiro ciclo e identidades confirmadas.


Senha: tela Minha conta e bloqueio de primeiro acesso implementados; migração aplicada. Senha provisória ainda não definida nem marca obrigatória ativada. Ver docs/LOGIN.md antes de entregar acesso ao RH.
