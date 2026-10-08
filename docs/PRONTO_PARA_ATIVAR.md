# Ativação Cardiofitness

Implementado e conectado: painel RH, login Google validado, e-mail/senha habilitado, Supabase com acesso restrito, 28 colaboradores e cinco líderes cadastrados, Forms API com leitura autorizada e dois presets com perguntas reais. Ciclos são bimestrais: RH escolhe início e o encerramento é sugerido automaticamente para dois meses; ajuste permitido antes de resultados. Datas de teste foram descartadas. Nenhum ciclo real foi criado por suposição.

## Operação e publicação pendentes

- RH iniciar o primeiro ciclo e escolher participantes pelo painel.
- PDF do RH confirmado como fonte oficial: nomes, setores e lideranças já importados prevalecem. As listas antigas dos Forms são desconsideradas como cadastro. Alinhar identificação da coleta ao PDF antes de sincronizar; nenhum alias ou identidade é criado por aproximação.
- Vincular os presets ao ciclo e conferir identificação/perguntas antes de sincronizar.
- Formulários continuam rascunhos: publicar coleta quando a empresa decidir iniciar.
- Senha alterada manualmente pelo responsável; conferir entrega real do link de recuperação.
- Publicação concluída em https://cardiofitness-smoky.vercel.app: variáveis de produção salvas, retorno Supabase configurado, login Google institucional e 33 cadastros reais verificados. Não há demonstrações.
- Revisar OAuth Google em Testing antes da operação contínua (token Forms pode expirar em sete dias).

Validação: TypeScript, build de produção e 138 testes aprovados em 08/10/2026. Na interface autenticada, entrada por teclado confirmou cálculo de dois meses. Nenhuma resposta privada ou avaliação de teste enviada; banco sem ciclos/avaliações fictícias. Exportações e normalização testadas com fixtures locais; sincronização real ainda exige primeiro ciclo e identidades confirmadas.


Senha: tela Minha conta e bloqueio de primeiro acesso implementados; migração aplicada. Responsável confirmou alteração manual da senha; agente preservou a credencial escolhida. Ver docs/LOGIN.md antes de entregar acesso ao RH.

Entrega GitHub: versão local preparada para main do repositório privado italopabloferreria/cardiofitness. Colagem de links por ciclo e validação link/ID da API implementadas. Banco auditado sem demonstrações; login Google novamente confirmado após salvar callback. Ver SUPABASE_VERIFICADO.md.
