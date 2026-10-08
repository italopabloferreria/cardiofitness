# Recriação dos formulários na conta institucional

## Estado em 8 de outubro de 2026

A pedido de Ítalo, os dois formulários públicos foram recriados em **cadiofit@gmail.com**, preservando o fluxo visível do que já funciona. A execução do roteiro e a conferência nos editores foram concluídas. Os destinos continuam **rascunhos não publicados**; configurações de coleta já definidas; validar cadastros e ativar a coleta antes de distribuir links.

- [Líderes — edição](https://docs.google.com/forms/d/1crkqvvjyDrSUu7C0SHhS0le7_x89CPPQEJCAIY8BTso/edit).
- [Autoavaliação e Equipe — edição](https://docs.google.com/forms/d/1ugPS-wx1YVdOHYXXH-xbKCkSQk1ZhMF9g1h80n0X4hU/edit).
- [Projeto de preparação no Apps Script](https://script.google.com/u/1/home/projects/1En6gSYxion7cuaI0FmDcZGcyvwHBs8hC7HYsbaRNUfqH51yRczSO-3Jj/edit).

## Conteúdo e fluxo conferidos

São **63 perguntas**: 11 de Líderes e 52 de Equipe, com 28 títulos de grupos. Perguntas, alternativas em ordem, obrigatoriedade e escalas 1–4 foram preservadas; a conclusão do fluxo manteve os IDs das perguntas já criadas.

Líderes tem **três seções**: identificação, avaliação e “Agradecemos sua participação!”, sem campos na página final. As sete escalas não têm rótulos nas pontas, conforme o original.

Equipe tem **oito seções**: seleção inicial; Faturamento; Central/Resultado; Recepção/Triagem; Técnicas de Exame/Corredor; Limpeza; e duas páginas finais. As 31 escalas têm “Abaixo do esperado” e “Alto desempenho”. As cinco perguntas “Você já avaliou todos os envolvidos, inclusive você?” mantêm as alternativas: **Sim → “Agradecemos sua participação!”**; **Não → “Você ainda deve responder o formulário”**, com o texto exato “Clique em enviar formulário novamente, para repetir o mesmo processo”. Finais sem perguntas.

Os **12 caminhos** das seis alternativas iniciais × Sim/Não foram percorridos nos originais, com preenchimento temporário das obrigatórias e **sem clicar em Enviar**. “Resultado de Exame” direciona a Faturamento no original; essa rota foi preservada. A ordem dos cinco setores foi confirmada pela numeração das páginas. A posição física relativa das duas páginas finais não é demonstrada pela navegação pública; o rascunho coloca Não antes de Sim, mantendo os destinos observados.

Tema reproduzido nos editores e conferido na prévia: cor de destaque **#0c53ce**, fundo **#b6cbf0**, títulos **Lexend 24**, perguntas **Roboto 12** e texto **Roboto 11**. Barra de progresso ativada nos dois destinos, conforme os originais.

## Fontes, reprodução e limites

- [Original de Líderes](https://docs.google.com/forms/d/e/1FAIpQLSfVn_za-v4FPO_cVEvRx1qds8iaisyDDgnVpl8IAvr7f3lWog/viewform).
- [Original de Equipe e Autoavaliação](https://docs.google.com/forms/d/e/1FAIpQLSeWB-yAmVclSm7VBeOGot0dlun8Ws9AJS3984WJiEKSTfl8CA/viewform).
- Fonte atual do fluxo: `google-forms/formularios-blueprint-completo.json`.
- Histórico da primeira extração: `google-forms/formularios-captura.json` e `google-forms/formularios-blueprint.json`, preservados.
- Reprodução sequencial: `google-forms/criar-formularios.gs`, função `criarRascunhosCardiofitness`, seguida de `google-forms/completar-fluxo.gs`, função `completarFluxoCardiofitness`. O primeiro roteiro adota exclusivamente os dois rascunhos previstos; o segundo acrescenta finais, corrige rótulos e navegação, preservando perguntas. Nenhum publica ou consulta respostas. O tema e a barra de progresso foram aplicados pelo editor.
- Evidências de extração, rotas e conclusão ficam na pasta `google-forms`; a primeira conferência está em `verificacao-rascunhos.json` e `verificacao-rotas-setores.json`. A conferência atual está em `verificacao-final.json`, `rotas-originais-verificadas.json`, `configuracao-visual.json` e `execucao-conclusao.txt`. Os 12 caminhos foram também percorridos nas cópias em modo de visualização, onde o envio é desativado. Capturas preservadas em `outputs/Cardiofitness_Formulario_Lideres_Concluido.png` e `outputs/Cardiofitness_Formulario_Equipe_Concluido.png` na pasta desta sessão.

**Não é necessário compartilhar os originais para a recriação do fluxo público nem para autorizar a leitura dos formulários próprios.** Configurações privadas do proprietário — coleta de e-mail, acesso, limite de respostas, edição após envio e mensagem personalizada após envio — não puderam ser inferidas. Após Ítalo autorizar a definição, as configurações dos novos destinos foram escolhidas e conferidas; não são apresentadas como copiadas. As configurações dos novos formulários foram definidas e conferidas após autorização de Ítalo: identificação declarada por nome e setor, sem coleta adicional de e-mail, vários envios permitidos, edição após envio desativada, resumo dos resultados oculto, barra de progresso e link para outra resposta ativos. Edição e respostas permanecem restritas à conta institucional proprietária. As mensagens de confirmação foram definidas para os novos destinos; não são apresentadas como cópia das configurações privadas dos originais. Evidência: `google-forms/configuracao-coleta-verificada.json`.

As respostas e o histórico dos originais **não foram transferidos nem consultados**. Os novos formulários têm novos IDs de formulário e pergunta; receberão apenas novos envios pelos links de coleta que forem publicados e distribuídos. Não reutilizar mapeamentos dos originais.

O PDF de colaboradores foi comparado com as opções dos formulários. As diferenças estão em [divergencias-colaboradores.md](../google-forms/divergencias-colaboradores.md), com a extração em `google-forms/colaboradores-por-setor.json`. Nomes, setores e líderes não foram substituídos automaticamente; a empresa deve confirmar os cadastros e aliases antes da associação de respostas.

## Integração do sistema

A autorização Apps Script para preparar formulários **não ativa o OAuth somente leitura da aplicação**. Projeto Google Cloud, Forms API e OAuth de leitura ainda precisam ser configurados. A conta institucional é proprietária dos destinos. Uma conta de serviço, se escolhida como alternativa, exige acesso próprio aos novos formulários.

Supabase, usuários individuais do RH, cadastros, vínculos, ciclo e mapeamentos ainda aguardam ativação. A aplicação permanece em demonstração com dados fictícios; repositório e publicação na Vercel também estão pendentes. Campos textuais de feedback existentes nos formulários ficam fora da importação. Roteiro em [CONFIGURACAO.md](../CONFIGURACAO.md).
