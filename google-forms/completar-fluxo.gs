/**
 * Completa exclusivamente os dois rascunhos já criados e conferidos.
 * Preserva perguntas/IDs; não cria formulários, apaga itens, publica ou lê respostas.
 * Executar completarFluxoCardiofitness no projeto Apps Script já autorizado.
 * Fontes oficiais: developers.google.com/apps-script/reference/forms/form#moveItem(Item,Integer),
 * page-break-item#setGoToPage(PageNavigationType), multiple-choice-item#createChoice(String,PageBreakItem).
 * Não há transação FormApp: falha parcial exige conferir o editor antes de repetir.
 */
const FLOW_EXPECTED = [{"key":"leaders","id":"1crkqvvjyDrSUu7C0SHhS0le7_x89CPPQEJCAIY8BTso","title":"Avaliação | Líderes","questionCount":11,"sections":[{"title":"","items":[{"type":"LIST","title":"Qual o seu nome?","help":"","required":true,"options":["Ana Karolina","Ana Karoline","Bruna","Gabriel","Lucas","Joelson","Rute","João","Daiane Ramos","Renilda","Dayane Mares","Sulami","Roni","Eliane","Luzia","Solange","Helen Silva","Jaqueline","Júlia","Alice","Sabrina","Rayane","Luciana","Thiago","Emanuele","Maria da Luz","Maria Socorro"]},{"type":"LIST","title":"Qual o seu setor?","help":"","required":true,"options":["Faturamento","Central","Recepção","Técnicas de Exame/Corredor/Triagem","Limpeza","Entrega de Exames"]},{"type":"LIST","title":"Qual é a Líder responsável pelo seu setor?","help":"","required":true,"options":["Lídia","Cleuma","Welisson","Natacha"]}]},{"title":"Líderes","items":[{"type":"SECTION_HEADER","title":"Desempenho","help":""},{"type":"SCALE","title":"O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SCALE","title":"O funcionário tem desempenhado bem sua função?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SECTION_HEADER","title":"Trabalho em Equipe","help":""},{"type":"SCALE","title":"Passa as informações necessárias para seu grupo de trabalho?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SCALE","title":"Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SECTION_HEADER","title":"Liderança","help":""},{"type":"SCALE","title":"Consegue influenciar os demais colaboradores e motivá-los a participar das atividades propostas?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SCALE","title":"Entende a diversidade de personalidades e consegue despertar o melhor de cada uma?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SECTION_HEADER","title":"Cultura","help":""},{"type":"SCALE","title":"O funcionário reflete os valores da empresa?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"TEXT","title":"Deixe um feedbacks para seu líder?","help":"","required":true}]}]},{"key":"team","id":"1ugPS-wx1YVdOHYXXH-xbKCkSQk1ZhMF9g1h80n0X4hU","title":"Avaliação | Autoavaliação e Equipe","questionCount":52,"initialRoutes":{"Faturamento":"Faturamento","Central/Resultado de Exames":"Central/Resultado","Recepção":"Recepção/Triagem","Técnicas de Exame/Corredor/Triagem":"Técnicas de Exame/Corredor","Limpeza":"Limpeza","Resultado de Exame":"Faturamento"},"sections":[{"title":"","items":[{"type":"LIST","title":"Qual o seu setor?","help":"","required":true,"options":["Faturamento","Central/Resultado de Exames","Recepção","Técnicas de Exame/Corredor/Triagem","Limpeza","Resultado de Exame"]}]},{"title":"Recepção/Triagem","items":[{"type":"LIST","title":"Qual o seu nome?","help":"","required":true,"options":["Dayane Mares","Gabriel","Lucas","Jaqueline","Thiago","Ana Karoline"]},{"type":"LIST","title":"Quem você irá avaliar??","help":"","required":true,"options":["Dayane Mares","Gabriel","Lucas","Jaqueline","Ana Karoline"]},{"type":"SECTION_HEADER","title":"Desempenho","help":""},{"type":"SCALE","title":"O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SCALE","title":"O funcionário tem conhecimento dos convênios credenciados, consultas, exames e respectivos valores? ////// O funcionário tem conhecimento técnico dos exames da empresa?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SECTION_HEADER","title":"Trabalho em Equipe","help":""},{"type":"SCALE","title":"Passa as informações necessárias para seu grupo de trabalho?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SCALE","title":"Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SECTION_HEADER","title":"Ferramenta","help":""},{"type":"SCALE","title":"O funcionário tem domínio do software MedWare?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SECTION_HEADER","title":"Cultura","help":""},{"type":"SCALE","title":"O funcionário reflete os valores da empresa?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SECTION_HEADER","title":"Feedback","help":""},{"type":"PARAGRAPH_TEXT","title":"Dê um feedback para o seu colega ou para você!!","help":"","required":true},{"type":"MULTIPLE_CHOICE","title":"Você já avaliou todos os envolvidos, inclusive você?","help":"","required":true,"options":["Sim","Não"]}]},{"title":"Faturamento","items":[{"type":"LIST","title":"Qual o seu nome?","help":"","required":true,"options":["Ana","Bruna","Rayane","Sabrina"]},{"type":"LIST","title":"Quem você irá avaliar??","help":"","required":true,"options":["Ana","Bruna","Rayane","Sabrina"]},{"type":"SECTION_HEADER","title":"Desempenho","help":""},{"type":"SCALE","title":"O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SCALE","title":"O funcionário tem conhecimento amplo dos convênios que fatura/autoriza?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SECTION_HEADER","title":"Trabalho em Equipe","help":""},{"type":"SCALE","title":"Passa as informações necessárias para seu grupo de trabalho?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SCALE","title":"Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SECTION_HEADER","title":"Ferramenta","help":""},{"type":"SCALE","title":"O funcionário tem domínio do software MedWare?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SCALE","title":"O funcionário tem domínio dos sites dos convênios que fatura/autoriza?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SECTION_HEADER","title":"Cultura","help":""},{"type":"SCALE","title":"O funcionário reflete os valores da empresa?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SECTION_HEADER","title":"Feedback","help":""},{"type":"PARAGRAPH_TEXT","title":"Dê um feedback para o seu colega ou para você!!","help":"","required":true},{"type":"MULTIPLE_CHOICE","title":"Você já avaliou todos os envolvidos, inclusive você?","help":"","required":true,"options":["Sim","Não"]}]},{"title":"Central/Resultado","items":[{"type":"LIST","title":"Qual o seu nome?","help":"","required":true,"options":["Rute","Hellen Silva","Alice","Joelson","Emanuele","Luciana"]},{"type":"LIST","title":"Quem você irá avaliar??","help":"","required":true,"options":["Rute","Hellen Silva","Alice","Joelson","Emanuele","Luciana"]},{"type":"SECTION_HEADER","title":"Desempenho","help":""},{"type":"SCALE","title":"O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SCALE","title":"O funcionário tem conhecimento dos convênios credenciados, consultas, exames e respectivos valores?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SECTION_HEADER","title":"Trabalho em Equipe","help":""},{"type":"SCALE","title":"Passa as informações necessárias para seu grupo de trabalho?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SCALE","title":"Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SECTION_HEADER","title":"Ferramenta","help":""},{"type":"SCALE","title":"O funcionário tem domínio do software MedWare?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SCALE","title":"O funcionário tem domínio do software da Fasterisks?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SECTION_HEADER","title":"Cultura","help":""},{"type":"SCALE","title":"O funcionário reflete os valores da empresa?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SECTION_HEADER","title":"Feedback","help":""},{"type":"PARAGRAPH_TEXT","title":"Dê um feedback para o seu colega ou para você!!","help":"","required":true},{"type":"MULTIPLE_CHOICE","title":"Você já avaliou todos os envolvidos, inclusive você?","help":"","required":true,"options":["Sim","Não"]}]},{"title":"Técnicas de Exame/Corredor","items":[{"type":"LIST","title":"Qual o seu nome?","help":"","required":true,"options":["Sulami","Renilda","Roni","Eliane","Luzia","Daiane Ramos","Júlia"]},{"type":"LIST","title":"Quem você irá avaliar?","help":"","required":true,"options":["Eliane","Daiane Ramos","Luzia","Renilda","Roni","Sulami","Júlia"]},{"type":"SECTION_HEADER","title":"Desempenho","help":""},{"type":"SCALE","title":"O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SCALE","title":"O funcionário tem conhecimento técnico dos exames da empresa?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SECTION_HEADER","title":"Trabalho em Equipe","help":""},{"type":"SCALE","title":"Passa as informações necessárias para seu grupo de trabalho?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SCALE","title":"Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SECTION_HEADER","title":"Ferramenta","help":""},{"type":"SCALE","title":"O funcionário tem domínio do software MedWare?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SECTION_HEADER","title":"Cultura","help":""},{"type":"SCALE","title":"O funcionário reflete os valores da empresa?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SECTION_HEADER","title":"Feedback","help":""},{"type":"PARAGRAPH_TEXT","title":"Dê um feedback para o seu colega ou para você!!","help":"","required":true},{"type":"MULTIPLE_CHOICE","title":"Você já avaliou todos os envolvidos, inclusive você?","help":"","required":true,"options":["Sim","Não"]}]},{"title":"Limpeza","items":[{"type":"LIST","title":"Qual o seu nome?","help":"","required":true,"options":["Maria da Luz","Maria Socorro"]},{"type":"LIST","title":"Quem você irá avaliar?","help":"","required":true,"options":["Maria da Luz","Maria Socorro"]},{"type":"SECTION_HEADER","title":"Desempenho","help":""},{"type":"SCALE","title":"O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SCALE","title":"O funcionário tem desempenhado bem sua função?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SECTION_HEADER","title":"Trabalho em Equipe","help":""},{"type":"SCALE","title":"Passa as informações necessárias para seu grupo de trabalho?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SCALE","title":"Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SECTION_HEADER","title":"Cultura","help":""},{"type":"SCALE","title":"O funcionário reflete os valores da empresa?","help":"","required":true,"min":1,"max":4,"low":"","high":""},{"type":"SECTION_HEADER","title":"Feedback","help":""},{"type":"PARAGRAPH_TEXT","title":"Dê um feedback para o seu colega ou para você!!","help":"","required":true},{"type":"MULTIPLE_CHOICE","title":"Você já avaliou todos os envolvidos, inclusive você?","help":"","required":true,"options":["Sim","Não"]}]}]}];
const FLOW_ACCOUNT = 'cadiofit@gmail.com';
const FLOW_THANKS = 'Agradecemos sua participação!';
const FLOW_INCOMPLETE = 'Você ainda deve responder o formulário';
const FLOW_INCOMPLETE_HELP = 'Clique em enviar formulário novamente, para repetir o mesmo processo';
const FLOW_TEAM_LOW = 'Abaixo do esperado';
const FLOW_TEAM_HIGH = 'Alto desempenho';
const FLOW_TEAM_ORDER = ['Faturamento', 'Central/Resultado', 'Recepção/Triagem', 'Técnicas de Exame/Corredor', 'Limpeza'];

function completarFluxoCardiofitness() {
  if (Session.getEffectiveUser().getEmail().toLowerCase() !== FLOW_ACCOUNT) throw new Error('Execute na conta ' + FLOW_ACCOUNT + '.');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('Outra execução está em andamento.');
  try {
    // Both forms must pass before the first mutation.
    const checked = FLOW_EXPECTED.map(spec => flowCheck_(FormApp.openById(spec.id), spec));
    const leaders = checked[0];
    const team = checked[1];
    team.form.getItems().filter(item => item.getType() === FormApp.ItemType.SCALE)
      .forEach(item => item.asScaleItem().setLabels(FLOW_TEAM_LOW, FLOW_TEAM_HIGH));
    const leaderThanks = flowFinal_(leaders, FLOW_THANKS, '');
    flowOrder_(leaders.form, leaders.blocks[0].items.concat(leaders.blocks[1].items, [leaderThanks]));
    leaders.blocks[1].items[0].asPageBreakItem().setGoToPage(FormApp.PageNavigationType.CONTINUE);
    leaderThanks.setGoToPage(FormApp.PageNavigationType.CONTINUE);

    const incomplete = flowFinal_(team, FLOW_INCOMPLETE, FLOW_INCOMPLETE_HELP);
    const teamThanks = flowFinal_(team, FLOW_THANKS, '');
    const sectors = FLOW_TEAM_ORDER.map(title => team.blocks.find(block => block.title === title));
    const items = team.blocks[0].items.concat(...sectors.map(block => block.items), [incomplete, teamThanks]);
    flowOrder_(team.form, items);
    sectors.forEach(block => {
      const question = block.items[block.items.length - 1].asMultipleChoiceItem();
      question.setChoices([question.createChoice('Sim', teamThanks), question.createChoice('Não', incomplete)]);
      block.items[0].asPageBreakItem().setGoToPage(FormApp.PageNavigationType.CONTINUE);
    });
    incomplete.setGoToPage(FormApp.PageNavigationType.CONTINUE);
    // PageBreak applies to the PREVIOUS page: finishing the incomplete page submits.
    teamThanks.setGoToPage(FormApp.PageNavigationType.SUBMIT);
    // The thanks page is last and naturally ends with Enviar; no synthetic restart.

    const after = FLOW_EXPECTED.map(spec => flowCheck_(FormApp.openById(spec.id), spec, true));
    flowAssert_(after[0].blocks.length === 3 && after[1].blocks.length === 8, 'Quantidade final de seções incorreta.');
    flowAssert_(after[1].blocks.map(block => block.title).slice(1).join('|') === FLOW_TEAM_ORDER.concat([FLOW_INCOMPLETE, FLOW_THANKS]).join('|'), 'Ordem final incorreta.');
    const result = after.map(value => ({ id: value.form.getId(), editUrl: value.form.getEditUrl(),
      questions: value.spec.questionCount, sections: value.blocks.length, state: 'FLOW_COMPLETED_DRAFT_UNPUBLISHED' }));
    console.log(JSON.stringify(result, null, 2));
    return result;
  } finally { lock.releaseLock(); }
}

function flowAssert_(condition, message) { if (!condition) throw new Error(message + ' Nada será removido ou recriado.'); }

function flowCheck_(form, spec, requireFinalLabels) {
  flowAssert_(form.getTitle() === spec.title, 'Título do formulário alterado.');
  flowAssert_(form.supportsAdvancedResponderPermissions() && !form.isPublished(), 'O destino deve permanecer rascunho não publicado.');
  const blocks = [{ title: '', items: [] }];
  form.getItems().forEach(item => {
    if (item.getType() === FormApp.ItemType.PAGE_BREAK) blocks.push({ title: item.getTitle(), items: [item] });
    else blocks[blocks.length - 1].items.push(item);
  });
  const expectedTitles = spec.sections.map(section => section.title);
  const finalTitles = spec.key === 'leaders' ? [FLOW_THANKS] : [FLOW_INCOMPLETE, FLOW_THANKS];
  const seen = new Set();
  blocks.forEach((block, index) => {
    flowAssert_(!seen.has(block.title), 'Seção duplicada: ' + block.title + '.');
    seen.add(block.title);
    if (index === 0) flowAssert_(block.title === '', 'Identificação inicial inválida.');
    const expected = spec.sections.find(section => section.title === block.title);
    if (expected) {
      const actual = block.items.filter(item => item.getType() !== FormApp.ItemType.PAGE_BREAK).map(flowDescribe_);
      const expectedItems = expected.items.map(item => {
        if (spec.key !== 'team' || item.type !== 'SCALE') return item;
        return Object.assign({}, item, { low: FLOW_TEAM_LOW, high: FLOW_TEAM_HIGH });
      });
      actual.forEach(item => {
        if (spec.key !== 'team' || item.type !== 'SCALE') return;
        const empty = item.low === '' && item.high === '';
        const exact = item.low === FLOW_TEAM_LOW && item.high === FLOW_TEAM_HIGH;
        flowAssert_(exact || (!requireFinalLabels && empty), 'Rótulos de escala da equipe alterados.');
        // Permit only the old builder's two empty labels during initial preflight.
        if (empty) { item.low = FLOW_TEAM_LOW; item.high = FLOW_TEAM_HIGH; }
      });
      flowAssert_(JSON.stringify(actual) === JSON.stringify(expectedItems), 'Conteúdo, alternativas ou obrigatoriedade alterados na seção ' + (block.title || 'inicial') + '.');
      if (index > 0) flowAssert_(block.items[0].asPageBreakItem().getHelpText() === '', 'Descrição de setor alterada.');
      if (spec.key === 'team' && index > 0) {
        const last = block.items[block.items.length - 1];
        flowAssert_(last.getType() === FormApp.ItemType.MULTIPLE_CHOICE && last.getTitle() === 'Você já avaliou todos os envolvidos, inclusive você?', 'Pergunta de fluxo fora do fim do setor.');
      }
    } else {
      flowAssert_(finalTitles.includes(block.title) && block.items.length === 1, 'Seção inesperada ou final com perguntas não previstas.');
      const help = block.title === FLOW_INCOMPLETE ? FLOW_INCOMPLETE_HELP : '';
      flowAssert_(block.items[0].asPageBreakItem().getHelpText() === help, 'Descrição da página final alterada.');
    }
  });
  flowAssert_(expectedTitles.every(title => seen.has(title)), 'Seção original ausente.');
  flowAssert_(blocks.length >= spec.sections.length && blocks.length <= spec.sections.length + finalTitles.length, 'Contagem de seções inesperada.');
  const questions = form.getItems().filter(item => ![FormApp.ItemType.SECTION_HEADER, FormApp.ItemType.PAGE_BREAK].includes(item.getType()));
  flowAssert_(questions.length === spec.questionCount, 'Contagem de perguntas alterada.');
  if (spec.key === 'team') {
    // Choice.getGotoPage() returns null for LIST. Initial routes were checked in
    // the editor; this patch preserves selector choices and all item IDs.
    Object.values(spec.initialRoutes).forEach(title =>
      flowAssert_(seen.has(title), 'Destino inicial de setor ausente: ' + title + '.'));
    if (requireFinalLabels) blocks.filter(block => FLOW_TEAM_ORDER.includes(block.title)).forEach(block => {
      const choices = block.items[block.items.length - 1].asMultipleChoiceItem().getChoices();
      const expected = [FLOW_THANKS, FLOW_INCOMPLETE];
      choices.forEach((choice, index) => {
        const target = choice.getGotoPage();
        flowAssert_(target && target.getTitle() === expected[index], 'Rota Sim/Não incorreta na seção ' + block.title + '.');
      });
    });
  }
  return { form: form, spec: spec, blocks: blocks };
}

function flowDescribe_(item) {
  const type = item.getType();
  const casts = { TEXT: 'asTextItem', PARAGRAPH_TEXT: 'asParagraphTextItem', MULTIPLE_CHOICE: 'asMultipleChoiceItem',
    LIST: 'asListItem', SCALE: 'asScaleItem', SECTION_HEADER: 'asSectionHeaderItem' };
  const label = String(type);
  flowAssert_(casts[label], 'Tipo de item inesperado.');
  const typed = item[casts[label]]();
  const result = { type: label, title: typed.getTitle(), help: typed.getHelpText() };
  if (type !== FormApp.ItemType.SECTION_HEADER) result.required = typed.isRequired();
  if (type === FormApp.ItemType.LIST || type === FormApp.ItemType.MULTIPLE_CHOICE) result.options = typed.getChoices().map(choice => choice.getValue());
  if (type === FormApp.ItemType.SCALE) { result.min = typed.getLowerBound(); result.max = typed.getUpperBound(); result.low = typed.getLeftLabel(); result.high = typed.getRightLabel(); }
  return result;
}

function flowFinal_(checked, title, help) {
  const existing = checked.blocks.find(block => block.title === title);
  return existing ? existing.items[0].asPageBreakItem() : checked.form.addPageBreakItem().setTitle(title).setHelpText(help);
}

function flowOrder_(form, orderedItems) {
  flowAssert_(form.getItems().length === orderedItems.length, 'Itens extras no formulário.');
  orderedItems.forEach((item, index) => {
    if (item.getIndex() !== index) form.moveItem(item, index);
  });
}
