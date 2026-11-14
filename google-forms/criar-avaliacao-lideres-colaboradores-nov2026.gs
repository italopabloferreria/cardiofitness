/**
 * Cardiofitness — formulário separado: líderes avaliam colaboradores.
 *
 * Executar manualmente em https://script.google.com com a conta Google
 * institucional que terá acesso de edição e de leitura via Forms API.
 * Não modifica os dois formulários anteriores.
 *
 * IMPORTANTE: o formulário fica fechado até ativarColetaLideresColaboradores().
 * O sistema RH faz a validação dos vínculos no ciclo ao importar respostas.
 * Nomes digitados no campo de colaborador devem corresponder ao cadastro.
 */
const CF_NOV_2026 = {
  property: 'CARDIOFITNESS_LEAD_TO_EMPLOYEE_FORM_ID_NOV2026',
  title: 'Cardiofitness | Líder avalia colaborador | Novembro 2026',
  leaders: ['LIDIA VIANA', 'CLEUMA', 'GABRIEL', 'WELISSON', 'MARIA'],
  departments: [
    'FATURAMENTO E AUXILIARES DE FATURAMENTO',
    'COPEIRAS',
    'CENTRAL E RESULTADOS DE EXAMES',
    'TÉCNICAS E CORREDOR',
    'RECEPÇÃO E TRIAGEM',
    'ADM'
  ],
  criteria: [
    'Organiza as atividades e cumpre os prazos combinados?',
    'Executa suas atividades com qualidade e atenção?',
    'Demonstra conhecimento e cuidado nas tarefas da função?',
    'Comunica informações importantes com clareza e respeito?',
    'Colabora com a equipe para solucionar dificuldades?',
    'Demonstra responsabilidade, pontualidade e comprometimento?',
    'Age de acordo com os valores e orientações da Cardiofitness?'
  ]
};

function abrirFormularioLideresColaboradores_() {
  const id = PropertiesService.getScriptProperties().getProperty(CF_NOV_2026.property);
  if (!id) throw new Error('Execute criarFormularioLideresColaboradores primeiro.');
  return FormApp.openById(id);
}

/** Criação protegida: repetir não duplica um formulário existente. */
function criarFormularioLideresColaboradores() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const props = PropertiesService.getScriptProperties();
    const existingId = props.getProperty(CF_NOV_2026.property);
    if (existingId) {
      const existing = FormApp.openById(existingId);
      Logger.log('Formulário já criado. Edição: ' + existing.getEditUrl());
      Logger.log('Preenchimento: ' + existing.getPublishedUrl());
      return;
    }
    const form = FormApp.create(CF_NOV_2026.title);
    // Salvar o ID imediatamente reduz risco de criação duplicada se ocorrer
    // alguma falha de configuração após o FormApp.create.
    props.setProperty(CF_NOV_2026.property, form.getId());
    form.setAcceptingResponses(false);
    form.setDescription(
      'Uso exclusivo das lideranças da Cardiofitness. Avalie um colaborador por envio.' +
      '\nPeríodo: novembro de 2026 (até 30/11).' +
      '\nNotas: 1 = precisa melhorar; 2 = em desenvolvimento; 3 = atende ao esperado; 4 = supera o esperado.' +
      '\nA pessoa avaliada deve pertencer à sua equipe neste ciclo.'
    );
    form.setConfirmationMessage('Avaliação registrada. Para avaliar outra pessoa, abra o formulário novamente.');
    form.setProgressBar(true);
    form.setAllowResponseEdits(false);
    form.setLimitOneResponsePerUser(false);
    // Sem e-mails confirmados no cadastro oficial, o sincronizador usa
    // identificação textual. Não habilitar coleta de e-mail sem mapear os
    // e-mails dos líderes no cadastro RH.
    form.setCollectEmail(false);

    form.addSectionHeaderItem().setTitle('Identificação');
    form.addListItem()
      .setTitle('Nome do líder que está avaliando')
      .setChoiceValues(CF_NOV_2026.leaders)
      .setRequired(true);
    form.addTextItem()
      .setTitle('Nome completo do colaborador avaliado')
      .setHelpText('Copie exatamente o nome do cadastro da Cardiofitness. Não use apelidos.')
      .setRequired(true);
    form.addListItem()
      .setTitle('Setor do colaborador')
      .setChoiceValues(CF_NOV_2026.departments)
      .setRequired(true);

    form.addPageBreakItem().setTitle('Avaliação do desempenho');
    CF_NOV_2026.criteria.forEach(function (criterion) {
      form.addScaleItem()
        .setTitle(criterion)
        .setBounds(1, 4)
        .setLabels('Precisa melhorar', 'Supera o esperado')
        .setRequired(true);
    });
    form.addParagraphTextItem()
      .setTitle('Pontos fortes e orientações para desenvolvimento')
      .setHelpText('Descreva fatos observáveis e recomendações construtivas.')
      .setRequired(false);
    form.setAcceptingResponses(false);
    Logger.log('CRIADO — formulário fechado para respostas.');
    Logger.log('Edição: ' + form.getEditUrl());
    Logger.log('Preenchimento (compartilhar após ativação): ' + form.getPublishedUrl());
    Logger.log('ID da API (obter do link de edição): ' + form.getId());
  } finally {
    lock.releaseLock();
  }
}

/** Ativar apenas depois de revisar o formulário, os nomes e a conta Google. */
function ativarColetaLideresColaboradores() {
  const hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  if (hoje < '2026-11-01' || hoje > '2026-11-30') {
    throw new Error('A coleta de novembro só pode ser ativada entre 01/11 e 30/11/2026.');
  }
  const form = abrirFormularioLideresColaboradores_();
  form.setAcceptingResponses(true);
  agendarEncerramentoLideresColaboradores();
  Logger.log('Coleta ativa: ' + form.getPublishedUrl());
}

/** Agenda um encerramento único; proteção adicional no próprio callback. */
function agendarEncerramentoLideresColaboradores() {
  const handler = 'encerrarColetaLideresColaboradores';
  const closure = new Date('2026-12-01T03:05:00.000Z'); // 00h05 em Brasília
  if (new Date() >= closure) {
    encerrarColetaLideresColaboradores();
    return;
  }
  const exists = ScriptApp.getProjectTriggers().some(function (trigger) {
    return trigger.getHandlerFunction() === handler;
  });
  if (!exists) ScriptApp.newTrigger(handler).timeBased().at(closure).create();
}

/** Pode ser executado manualmente; não reabre a coleta. */
function encerrarColetaLideresColaboradores() {
  const hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  if (hoje <= '2026-11-30') return;
  abrirFormularioLideresColaboradores_().setAcceptingResponses(false);
  Logger.log('Coleta encerrada. Respostas existentes preservadas.');
}
