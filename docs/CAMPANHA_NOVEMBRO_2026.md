# Cardiofitness — campanha de novembro de 2026

## Decisão de RH (mensagens de 14/11/2026)

- **Colaboradores avaliam suas respectivas lideranças em novembro.**
- Somente o link da **Avaliação de líderes** será distribuído aos colaboradores nesta campanha.
- O RH quer a coleta aberta **até 30/11/2026**.
- Avaliações de colegas e autoavaliações ocorrem a cada dois meses, **não nesta divulgação de novembro**.
- A pedido do RH, preparar **um novo formulário, separado**, para **líderes avaliarem seus colaboradores**.

## Link existente para divulgação — colaboradores → líderes

https://docs.google.com/forms/d/e/1FAIpQLScI5us346mhyabPreE4ly7CXXZYBn5wwYBbXj6HJOGHErDpYQ/viewform

O formulário existente é do Google Forms. O aviso e a ocultação do link de equipe no dashboard **não fecham o Google Forms**, nem alteram seu calendário. O RH deve conferir as opções e ajustar a publicação/encerramento no Google. Não divulgar o link de equipe em novembro. A importação da coleta continua baseada nas datas do ciclo do banco.

## Novo formulário — líderes → colaboradores

O código está em `google-forms/criar-avaliacao-lideres-colaboradores-nov2026.gs`. Ele **não foi executado na conta Google**; não existe um link novo confirmado até sua execução.

1. Na conta Google institucional autorizada, abra [Google Apps Script](https://script.google.com), crie projeto privado, cole o arquivo e execute `criarFormularioLideresColaboradores`. Confira no log os links de edição, preenchimento e ID.
2. Confira as cinco lideranças existentes, os setores, o texto das sete perguntas (escala 1–4) e os campos de identificação. Os nomes estão baseados no cadastro anterior: **LIDIA VIANA, CLEUMA, GABRIEL, WELISSON, MARIA**. Atenção: o print diz «líder Welisson»; não alterar para Wellington por suposição.
3. O campo de colaborador é texto exato para permitir atualização de nomes **sem divulgar um catálogo desatualizado**. Cada líder deve avaliar somente seu time. A vinculação é conferida quando a resposta é importada pelo dashboard; não há acesso por login individual nesse formulário.
4. Em Configurações → Formulários, vincule o novo Form ao ciclo apropriado com tipo **Líder → Colaborador**; informe link de preenchimento, ID de edição e use «Ler perguntas». Marque os campos de respondente, pessoa avaliada, setor e as sete perguntas de escala 1–4. Confira a prévia e salve. Sem isso as respostas não aparecem no dashboard.
5. Se for aberto em novembro, execute `ativarColetaLideresColaboradores` após validar o ciclo e as equipes. Ele programa um gatilho para o encerramento próximo de **01/12/2026 às 00h05 (horário de Brasília)**. O agendamento não garante execução no minuto exato; conferir o fechamento manualmente em 30/11.
6. É possível chamar `encerrarColetaLideresColaboradores` a partir de 01/12. O código não elimina respostas existentes.

## Movimentações informadas pelo RH

| Pessoa no print | Status/alteração solicitada | Verificação obrigatória |
| --- | --- | --- |
| Lucas | Saiu | Cadastro anterior contém **LUCAS DOS SANTOS REIS** na Recepção; confirmar que é o mesmo Lucas antes de desativar. |
| Suzana Matias da Silva Barbosa | Saiu | Não consta no cadastro-base de 08/10; se estiver cadastrada em produção, desativar pelo ID correto. |
| «VOTORIA BARROS LIMA» | Entrou na Recepção, liderança Welisson | Print aparentemente contém «VOTORIA»; confirmar se a grafia correta é **VITÓRIA** antes de gravar. |
| Paulo Gabriel | Entrou na Central, liderança Gabriel | O cadastro-base já possui **paulo** na Central. Confirmar se é a mesma pessoa; atualizar registro existente se for. |
| Josiane | Entrou na Central, liderança Gabriel | Conferir nome completo oficial, eventual registro existente e grafia para o Google Forms. |

**Não foram realizadas atualizações desses registros no Supabase da Cardiofitness.** A conexão Supabase atualmente disponível nesta conversa aponta para o projeto **thayna**, que não deve receber movimentações da Cardiofitness. Também não foram modificados ciclos que já possuem respostas, para preservar vínculos históricos.

## Checklist de ativação

- Confirmar o projeto Supabase institucional **da Cardiofitness**, sem usar o da Thayná.
- Confirmar nomes e homônimos, desativar pessoas desligadas preservando histórico, cadastrar/atualizar admitidas; revisar vínculos do ciclo e evitar duplicatas.
- Atualizar nomes nos formulários já existentes, inclusive retirar quem saiu; as opções dos Forms não acompanham automaticamente a tabela de colaboradores.
- Conferir se o ciclo correto compreende **01/11 a 30/11/2026**, ou criar uma campanha independente: não alterar datas de ciclos com respostas.
- Revisar se não há outros formulários do mesmo Google Form com períodos sobrepostos.
- Validar a nova coleta com a conta Google, criar o formulário e vincular seu ID/mapeamento no dashboard.
- Conferir abertura/fechamento da coleta no Google Forms e sincronização das respostas, com as permissões institucionais.
- Executar `npm run typecheck`, `npm test`, `npm run build` e homologar no ambiente de preview, antes do merge.
