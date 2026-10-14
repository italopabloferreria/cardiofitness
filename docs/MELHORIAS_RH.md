# Melhorias para a operação do RH

## Preparar próximo ciclo
Em Configurações → Ciclos e participantes, use **Preparar próximo** no ciclo de referência. Confira nome, datas bimestrais, participantes ativos e vínculos. O salvamento cria ciclo e cópias das configurações dos formulários em uma transação. Não copia respostas. Os totais esperados são recalculados. Um formulário compartilhado não pode ter períodos sobrepostos.

## Nomes no Google Forms
Em Configurações → Formulários, selecione o ciclo/formulário e use **Conferir nomes do formulário**. A prévia usa somente participantes ativos deste ciclo e líderes vinculados, excluindo testes de outros ciclos. Somente listas de identificação mapeadas são atualizadas; perguntas, notas e histórico continuam preservados. Alterações ambíguas, campos com desvios e edição de formulário usado por outro ciclo em coleta são bloqueadas. A prévia expira se cadastros ou revisão mudarem. Confira as opções antes de aplicar.

Ativação técnica: o responsável deve autorizar forms.body além de forms.responses.readonly, usando o helper google-authorize.mjs com --allow-form-editing; salvar o novo refresh token como segredo de produção na Vercel e ativar GOOGLE_FORMS_WRITE_ENABLED=true. Uma aprovação no chat não substitui o consentimento da conta no Google. Somente depois do consentimento a edição fica habilitada.

## Central de sincronização
A aba Sincronização separa credenciais configuradas de consulta recente, consulta atrasada, respostas a conferir, falhas, ciclos futuros e histórico fora da janela automática. Mostra data/hora da tentativa e sucesso e motivos genéricos de rejeição; não expõe segredos. Consultar agora reaproveita o botão de sincronização existente.

## Pendências em PDF/Excel
Os botões na aba Pendências exportam exatamente as pessoas/formulários/status do recorte filtrado e quem falta avaliar. A conferir indica ausência de verificação, não ausência confirmada.

## Relatório com textos
Excel inclui a planilha Respostas de texto. PDF inclui apêndice com respondente, pessoa avaliada, pergunta, conteúdo e data. Textos longos são paginados, com os mesmos filtros usados para as notas.

## Comparar ciclos
Em Relatórios, escolha dois ciclos, seus formulários e a perspectiva. Filtre pessoa ou setor. Só compara perguntas únicas com título, seção, escala e modalidade equivalentes. Mostra média, tamanho da amostra e diferença; perguntas ambíguas ou sem respostas são excluídas.

## Acessos do RH
Em Configurações → Acessos do RH, administradores podem autorizar contas já existentes no Supabase Auth, trocar perfil ou revogar autorização. Não cria senha nem envia convites automaticamente. Cada ação registra responsável, conta e horário. Usuário não pode alterar seu próprio acesso; administrador necessário é preservado. Revogação bloqueia novas consultas mesmo que exista token de sessão.

A primeira administração de cadiofit@gmail.com foi autorizada explicitamente pelo responsável. A função é verificada no banco, nunca em campos editáveis pelo usuário. Nenhuma outra conta é autorizada automaticamente.

## Ativação desta entrega — 14/10/2026

Funções 07/08/09 aplicadas no Supabase institucional e administração de cadiofit@gmail.com conferida no banco. Nenhuma outra conta foi autorizada e nenhum registro de avaliação foi removido.

Edição das listas: autorizada pelo responsável, mas o Google exigiu novamente a senha da conta. O responsável optou por concluir o login depois. A leitura permanece ativa com a autorização existente; a edição fica desabilitada até obter e instalar o novo token e ativar a variável no servidor. Não afirmar que uma prévia alterou o Forms.
