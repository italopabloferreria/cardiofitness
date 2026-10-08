/**
 * TEMPLATE LOCAL: não executado. Preencher apenas os dois rascunhos já criados
 * e verificados pelo agente principal na conta institucional. Não cria formulários.
 * Schema: {forms:[{key,title,description?,sections:[{key,title?,description?,
 *   next:'CONTINUE'|'SUBMIT'|sectionKey|null,
 *   items:[{key,type:'TEXT'|'PARAGRAPH'|'CHOICE'|'DROPDOWN'|'SCALE'|'SECTION_HEADER',title,
 *     description?,required,options?:[{value,target?:sectionKey|'CONTINUE'|'SUBMIT'|null}],
 *     min?:1,max?:4,lowLabel?,highLabel?}]}]}]}
 * First section: title/description only render a header if explicitly supplied.
 * null means unknown routing: mark pending and stop the draft section via SUBMIT.
 * This safe draft fallback is NOT represented as the original form's routing.
 * Unknown email collection/access/edit/confirmation/theme settings are not inferred.
 * Sources: developers.google.com/apps-script/reference/forms/{form-app,form,
 * multiple-choice-item,list-item,page-break-item,scale-item};
 * developers.google.com/apps-script/reference/{properties/properties-service,lock/lock-service}.
 */
const FORMS_BLUEPRINT = {
  "capturedFrom": "DOM público sem envio de respostas",
  "state": "DRAFT_NEEDS_REVIEW",
  "pending": [
    "Líderes: a segunda página termina com Avançar. Página seguinte/final não acessível sem preencher obrigatórias; não foi inventada.",
    "Equipe: destinos das respostas Sim/Não não verificáveis sem preencher obrigatórias; nenhuma avaliação fictícia de pessoa real foi preenchida.",
    "Descrições iniciais, rótulos de escala não presentes no DOM capturado, confirmação, acesso, coleta de e-mail, limite/edição de respostas e identidade visual exigem revisão.",
    "Rascunhos não publicados. A última seção conhecida pode mostrar Enviar no editor porque a continuação original é desconhecida; não estão prontos para coleta.",
    "Destinos desconhecidos usam encerramento SUBMIT como proteção provisória de rascunho, não como reprodução confirmada da lógica original."
  ],
  "forms": [
    {
      "key": "leaders",
      "title": "Avaliação | Líderes",
      "sourceUrl": "https://docs.google.com/forms/d/e/1FAIpQLSfVn_za-v4FPO_cVEvRx1qds8iaisyDDgnVpl8IAvr7f3lWog/viewform",
      "state": "DRAFT_NEEDS_REVIEW",
      "sections": [
        {
          "key": "identificacao",
          "next": "CONTINUE",
          "items": [
            {
              "key": "identificacao-1",
              "title": "Qual o seu nome?",
              "required": true,
              "type": "DROPDOWN",
              "options": [
                {
                  "value": "Ana Karolina"
                },
                {
                  "value": "Ana Karoline"
                },
                {
                  "value": "Bruna"
                },
                {
                  "value": "Gabriel"
                },
                {
                  "value": "Lucas"
                },
                {
                  "value": "Joelson"
                },
                {
                  "value": "Rute"
                },
                {
                  "value": "João"
                },
                {
                  "value": "Daiane Ramos"
                },
                {
                  "value": "Renilda"
                },
                {
                  "value": "Dayane Mares"
                },
                {
                  "value": "Sulami"
                },
                {
                  "value": "Roni"
                },
                {
                  "value": "Eliane"
                },
                {
                  "value": "Luzia"
                },
                {
                  "value": "Solange"
                },
                {
                  "value": "Helen Silva"
                },
                {
                  "value": "Jaqueline"
                },
                {
                  "value": "Júlia"
                },
                {
                  "value": "Alice"
                },
                {
                  "value": "Sabrina"
                },
                {
                  "value": "Rayane"
                },
                {
                  "value": "Luciana"
                },
                {
                  "value": "Thiago"
                },
                {
                  "value": "Emanuele"
                },
                {
                  "value": "Maria da Luz"
                },
                {
                  "value": "Maria Socorro"
                }
              ]
            },
            {
              "key": "identificacao-2",
              "title": "Qual o seu setor?",
              "required": true,
              "type": "DROPDOWN",
              "options": [
                {
                  "value": "Faturamento"
                },
                {
                  "value": "Central"
                },
                {
                  "value": "Recepção"
                },
                {
                  "value": "Técnicas de Exame/Corredor/Triagem"
                },
                {
                  "value": "Limpeza"
                },
                {
                  "value": "Entrega de Exames"
                }
              ]
            },
            {
              "key": "identificacao-3",
              "title": "Qual é a Líder responsável pelo seu setor?",
              "required": true,
              "type": "DROPDOWN",
              "options": [
                {
                  "value": "Lídia"
                },
                {
                  "value": "Cleuma"
                },
                {
                  "value": "Welisson"
                },
                {
                  "value": "Natacha"
                }
              ]
            }
          ]
        },
        {
          "key": "lideres",
          "title": "Líderes",
          "next": null,
          "items": [
            {
              "key": "lideres-1",
              "title": "Desempenho",
              "type": "SECTION_HEADER"
            },
            {
              "key": "lideres-2",
              "title": "O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "lideres-3",
              "title": "O funcionário tem desempenhado bem sua função?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "lideres-4",
              "title": "Trabalho em Equipe",
              "type": "SECTION_HEADER"
            },
            {
              "key": "lideres-5",
              "title": "Passa as informações necessárias para seu grupo de trabalho?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "lideres-6",
              "title": "Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "lideres-7",
              "title": "Liderança",
              "type": "SECTION_HEADER"
            },
            {
              "key": "lideres-8",
              "title": "Consegue influenciar os demais colaboradores e motivá-los a participar das atividades propostas?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "lideres-9",
              "title": "Entende a diversidade de personalidades e consegue despertar o melhor de cada uma?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "lideres-10",
              "title": "Cultura",
              "type": "SECTION_HEADER"
            },
            {
              "key": "lideres-11",
              "title": "O funcionário reflete os valores da empresa?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "lideres-12",
              "title": "Deixe um feedbacks para seu líder?",
              "required": true,
              "type": "TEXT"
            }
          ]
        }
      ],
      "existingFormId": "1crkqvvjyDrSUu7C0SHhS0le7_x89CPPQEJCAIY8BTso",
      "provenance": [
        "Identificação → Líderes observada por Avançar; continuação após escalas/feedback não observada."
      ]
    },
    {
      "key": "team",
      "title": "Avaliação | Autoavaliação e Equipe",
      "sourceUrl": "https://docs.google.com/forms/d/e/1FAIpQLSeWB-yAmVclSm7VBeOGot0dlun8Ws9AJS3984WJiEKSTfl8CA/viewform",
      "state": "DRAFT_NEEDS_REVIEW",
      "sections": [
        {
          "key": "identificacao",
          "next": "CONTINUE",
          "items": [
            {
              "key": "identificacao-1",
              "title": "Qual o seu setor?",
              "required": true,
              "type": "DROPDOWN",
              "options": [
                {
                  "value": "Faturamento",
                  "target": "faturamento"
                },
                {
                  "value": "Central/Resultado de Exames",
                  "target": "central-resultado"
                },
                {
                  "value": "Recepção",
                  "target": "recepcao-triagem"
                },
                {
                  "value": "Técnicas de Exame/Corredor/Triagem",
                  "target": "tecnicas-de-exame-corredor"
                },
                {
                  "value": "Limpeza",
                  "target": "limpeza"
                },
                {
                  "value": "Resultado de Exame",
                  "target": "faturamento"
                }
              ]
            }
          ]
        },
        {
          "key": "recepcao-triagem",
          "title": "Recepção/Triagem",
          "next": null,
          "items": [
            {
              "key": "recepcao-triagem-1",
              "title": "Qual o seu nome?",
              "required": true,
              "type": "DROPDOWN",
              "options": [
                {
                  "value": "Dayane Mares"
                },
                {
                  "value": "Gabriel"
                },
                {
                  "value": "Lucas"
                },
                {
                  "value": "Jaqueline"
                },
                {
                  "value": "Thiago"
                },
                {
                  "value": "Ana Karoline"
                }
              ]
            },
            {
              "key": "recepcao-triagem-2",
              "title": "Quem você irá avaliar??",
              "required": true,
              "type": "DROPDOWN",
              "options": [
                {
                  "value": "Dayane Mares"
                },
                {
                  "value": "Gabriel"
                },
                {
                  "value": "Lucas"
                },
                {
                  "value": "Jaqueline"
                },
                {
                  "value": "Ana Karoline"
                }
              ]
            },
            {
              "key": "recepcao-triagem-3",
              "title": "Desempenho",
              "type": "SECTION_HEADER"
            },
            {
              "key": "recepcao-triagem-4",
              "title": "O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "recepcao-triagem-5",
              "title": "O funcionário tem conhecimento dos convênios credenciados, consultas, exames e respectivos valores? ////// O funcionário tem conhecimento técnico dos exames da empresa?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "recepcao-triagem-6",
              "title": "Trabalho em Equipe",
              "type": "SECTION_HEADER"
            },
            {
              "key": "recepcao-triagem-7",
              "title": "Passa as informações necessárias para seu grupo de trabalho?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "recepcao-triagem-8",
              "title": "Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "recepcao-triagem-9",
              "title": "Ferramenta",
              "type": "SECTION_HEADER"
            },
            {
              "key": "recepcao-triagem-10",
              "title": "O funcionário tem domínio do software MedWare?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "recepcao-triagem-11",
              "title": "Cultura",
              "type": "SECTION_HEADER"
            },
            {
              "key": "recepcao-triagem-12",
              "title": "O funcionário reflete os valores da empresa?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "recepcao-triagem-13",
              "title": "Feedback",
              "type": "SECTION_HEADER"
            },
            {
              "key": "recepcao-triagem-14",
              "title": "Dê um feedback para o seu colega ou para você!!",
              "required": true,
              "type": "PARAGRAPH"
            },
            {
              "key": "recepcao-triagem-15",
              "title": "Você já avaliou todos os envolvidos, inclusive você?",
              "required": true,
              "type": "CHOICE",
              "options": [
                {
                  "value": "Sim",
                  "target": null
                },
                {
                  "value": "Não",
                  "target": null
                }
              ]
            }
          ]
        },
        {
          "key": "faturamento",
          "title": "Faturamento",
          "next": null,
          "items": [
            {
              "key": "faturamento-1",
              "title": "Qual o seu nome?",
              "required": true,
              "type": "DROPDOWN",
              "options": [
                {
                  "value": "Ana"
                },
                {
                  "value": "Bruna"
                },
                {
                  "value": "Rayane"
                },
                {
                  "value": "Sabrina"
                }
              ]
            },
            {
              "key": "faturamento-2",
              "title": "Quem você irá avaliar??",
              "required": true,
              "type": "DROPDOWN",
              "options": [
                {
                  "value": "Ana"
                },
                {
                  "value": "Bruna"
                },
                {
                  "value": "Rayane"
                },
                {
                  "value": "Sabrina"
                }
              ]
            },
            {
              "key": "faturamento-3",
              "title": "Desempenho",
              "type": "SECTION_HEADER"
            },
            {
              "key": "faturamento-4",
              "title": "O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "faturamento-5",
              "title": "O funcionário tem conhecimento amplo dos convênios que fatura/autoriza?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "faturamento-6",
              "title": "Trabalho em Equipe",
              "type": "SECTION_HEADER"
            },
            {
              "key": "faturamento-7",
              "title": "Passa as informações necessárias para seu grupo de trabalho?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "faturamento-8",
              "title": "Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "faturamento-9",
              "title": "Ferramenta",
              "type": "SECTION_HEADER"
            },
            {
              "key": "faturamento-10",
              "title": "O funcionário tem domínio do software MedWare?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "faturamento-11",
              "title": "O funcionário tem domínio dos sites dos convênios que fatura/autoriza?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "faturamento-12",
              "title": "Cultura",
              "type": "SECTION_HEADER"
            },
            {
              "key": "faturamento-13",
              "title": "O funcionário reflete os valores da empresa?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "faturamento-14",
              "title": "Feedback",
              "type": "SECTION_HEADER"
            },
            {
              "key": "faturamento-15",
              "title": "Dê um feedback para o seu colega ou para você!!",
              "required": true,
              "type": "PARAGRAPH"
            },
            {
              "key": "faturamento-16",
              "title": "Você já avaliou todos os envolvidos, inclusive você?",
              "required": true,
              "type": "CHOICE",
              "options": [
                {
                  "value": "Sim",
                  "target": null
                },
                {
                  "value": "Não",
                  "target": null
                }
              ]
            }
          ]
        },
        {
          "key": "central-resultado",
          "title": "Central/Resultado",
          "next": null,
          "items": [
            {
              "key": "central-resultado-1",
              "title": "Qual o seu nome?",
              "required": true,
              "type": "DROPDOWN",
              "options": [
                {
                  "value": "Rute"
                },
                {
                  "value": "Hellen Silva"
                },
                {
                  "value": "Alice"
                },
                {
                  "value": "Joelson"
                },
                {
                  "value": "Emanuele"
                },
                {
                  "value": "Luciana"
                }
              ]
            },
            {
              "key": "central-resultado-2",
              "title": "Quem você irá avaliar??",
              "required": true,
              "type": "DROPDOWN",
              "options": [
                {
                  "value": "Rute"
                },
                {
                  "value": "Hellen Silva"
                },
                {
                  "value": "Alice"
                },
                {
                  "value": "Joelson"
                },
                {
                  "value": "Emanuele"
                },
                {
                  "value": "Luciana"
                }
              ]
            },
            {
              "key": "central-resultado-3",
              "title": "Desempenho",
              "type": "SECTION_HEADER"
            },
            {
              "key": "central-resultado-4",
              "title": "O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "central-resultado-5",
              "title": "O funcionário tem conhecimento dos convênios credenciados, consultas, exames e respectivos valores?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "central-resultado-6",
              "title": "Trabalho em Equipe",
              "type": "SECTION_HEADER"
            },
            {
              "key": "central-resultado-7",
              "title": "Passa as informações necessárias para seu grupo de trabalho?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "central-resultado-8",
              "title": "Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "central-resultado-9",
              "title": "Ferramenta",
              "type": "SECTION_HEADER"
            },
            {
              "key": "central-resultado-10",
              "title": "O funcionário tem domínio do software MedWare?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "central-resultado-11",
              "title": "O funcionário tem domínio do software da Fasterisks?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "central-resultado-12",
              "title": "Cultura",
              "type": "SECTION_HEADER"
            },
            {
              "key": "central-resultado-13",
              "title": "O funcionário reflete os valores da empresa?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "central-resultado-14",
              "title": "Feedback",
              "type": "SECTION_HEADER"
            },
            {
              "key": "central-resultado-15",
              "title": "Dê um feedback para o seu colega ou para você!!",
              "required": true,
              "type": "PARAGRAPH"
            },
            {
              "key": "central-resultado-16",
              "title": "Você já avaliou todos os envolvidos, inclusive você?",
              "required": true,
              "type": "CHOICE",
              "options": [
                {
                  "value": "Sim",
                  "target": null
                },
                {
                  "value": "Não",
                  "target": null
                }
              ]
            }
          ]
        },
        {
          "key": "tecnicas-de-exame-corredor",
          "title": "Técnicas de Exame/Corredor",
          "next": null,
          "items": [
            {
              "key": "tecnicas-de-exame-corredor-1",
              "title": "Qual o seu nome?",
              "required": true,
              "type": "DROPDOWN",
              "options": [
                {
                  "value": "Sulami"
                },
                {
                  "value": "Renilda"
                },
                {
                  "value": "Roni"
                },
                {
                  "value": "Eliane"
                },
                {
                  "value": "Luzia"
                },
                {
                  "value": "Daiane Ramos"
                },
                {
                  "value": "Júlia"
                }
              ]
            },
            {
              "key": "tecnicas-de-exame-corredor-2",
              "title": "Quem você irá avaliar?",
              "required": true,
              "type": "DROPDOWN",
              "options": [
                {
                  "value": "Eliane"
                },
                {
                  "value": "Daiane Ramos"
                },
                {
                  "value": "Luzia"
                },
                {
                  "value": "Renilda"
                },
                {
                  "value": "Roni"
                },
                {
                  "value": "Sulami"
                },
                {
                  "value": "Júlia"
                }
              ]
            },
            {
              "key": "tecnicas-de-exame-corredor-3",
              "title": "Desempenho",
              "type": "SECTION_HEADER"
            },
            {
              "key": "tecnicas-de-exame-corredor-4",
              "title": "O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "tecnicas-de-exame-corredor-5",
              "title": "O funcionário tem conhecimento técnico dos exames da empresa?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "tecnicas-de-exame-corredor-6",
              "title": "Trabalho em Equipe",
              "type": "SECTION_HEADER"
            },
            {
              "key": "tecnicas-de-exame-corredor-7",
              "title": "Passa as informações necessárias para seu grupo de trabalho?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "tecnicas-de-exame-corredor-8",
              "title": "Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "tecnicas-de-exame-corredor-9",
              "title": "Ferramenta",
              "type": "SECTION_HEADER"
            },
            {
              "key": "tecnicas-de-exame-corredor-10",
              "title": "O funcionário tem domínio do software MedWare?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "tecnicas-de-exame-corredor-11",
              "title": "Cultura",
              "type": "SECTION_HEADER"
            },
            {
              "key": "tecnicas-de-exame-corredor-12",
              "title": "O funcionário reflete os valores da empresa?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "tecnicas-de-exame-corredor-13",
              "title": "Feedback",
              "type": "SECTION_HEADER"
            },
            {
              "key": "tecnicas-de-exame-corredor-14",
              "title": "Dê um feedback para o seu colega ou para você!!",
              "required": true,
              "type": "PARAGRAPH"
            },
            {
              "key": "tecnicas-de-exame-corredor-15",
              "title": "Você já avaliou todos os envolvidos, inclusive você?",
              "required": true,
              "type": "CHOICE",
              "options": [
                {
                  "value": "Sim",
                  "target": null
                },
                {
                  "value": "Não",
                  "target": null
                }
              ]
            }
          ]
        },
        {
          "key": "limpeza",
          "title": "Limpeza",
          "next": null,
          "items": [
            {
              "key": "limpeza-1",
              "title": "Qual o seu nome?",
              "required": true,
              "type": "DROPDOWN",
              "options": [
                {
                  "value": "Maria da Luz"
                },
                {
                  "value": "Maria Socorro"
                }
              ]
            },
            {
              "key": "limpeza-2",
              "title": "Quem você irá avaliar?",
              "required": true,
              "type": "DROPDOWN",
              "options": [
                {
                  "value": "Maria da Luz"
                },
                {
                  "value": "Maria Socorro"
                }
              ]
            },
            {
              "key": "limpeza-3",
              "title": "Desempenho",
              "type": "SECTION_HEADER"
            },
            {
              "key": "limpeza-4",
              "title": "O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "limpeza-5",
              "title": "O funcionário tem desempenhado bem sua função?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "limpeza-6",
              "title": "Trabalho em Equipe",
              "type": "SECTION_HEADER"
            },
            {
              "key": "limpeza-7",
              "title": "Passa as informações necessárias para seu grupo de trabalho?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "limpeza-8",
              "title": "Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "limpeza-9",
              "title": "Cultura",
              "type": "SECTION_HEADER"
            },
            {
              "key": "limpeza-10",
              "title": "O funcionário reflete os valores da empresa?",
              "required": true,
              "type": "SCALE",
              "min": 1,
              "max": 4
            },
            {
              "key": "limpeza-11",
              "title": "Feedback",
              "type": "SECTION_HEADER"
            },
            {
              "key": "limpeza-12",
              "title": "Dê um feedback para o seu colega ou para você!!",
              "required": true,
              "type": "PARAGRAPH"
            },
            {
              "key": "limpeza-13",
              "title": "Você já avaliou todos os envolvidos, inclusive você?",
              "required": true,
              "type": "CHOICE",
              "options": [
                {
                  "value": "Sim",
                  "target": null
                },
                {
                  "value": "Não",
                  "target": null
                }
              ]
            }
          ]
        }
      ],
      "existingFormId": "1ugPS-wx1YVdOHYXXH-xbKCkSQk1ZhMF9g1h80n0X4hU",
      "provenance": [
        "Seleção de Resultado de Exame após Voltar abriu Faturamento, conforme inspeção do navegador pelo agente principal.",
        "Duplicatas de identificação e de Faturamento removidas por conteúdo; placeholder Escolher removido, alternativas duplicadas consolidadas."
      ]
    }
  ]
};
const EXPECTED_ACCOUNT = 'cadiofit@gmail.com';

function criarRascunhosCardiofitness() {
  const warnings = validateBlueprint_(FORMS_BLUEPRINT);
  if (Session.getEffectiveUser().getEmail().toLowerCase() !== EXPECTED_ACCOUNT) {
    throw new Error('Execute somente na conta institucional ' + EXPECTED_ACCOUNT + '.');
  }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('Outra execução está em andamento.');
  try {
    const properties = PropertiesService.getScriptProperties();
    const results = FORMS_BLUEPRINT.forms.map(spec => createDraft_(spec, properties));
    console.log(JSON.stringify({ forms: results, reviewRequired: warnings }, null, 2));
    return results;
  } finally { lock.releaseLock(); }
}

function createDraft_(spec, properties) {
  const propertyKey = 'CARDIOFITNESS_DRAFT_' + spec.key;
  const hash = Utilities.base64EncodeWebSafe(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, JSON.stringify(spec), Utilities.Charset.UTF_8));
  const stored = properties.getProperty(propertyKey);
  if (stored) {
    const record = JSON.parse(stored);
    if (record.hash !== hash) throw new Error('Blueprint alterado para ' + spec.key + '. Conferir o rascunho existente; nada será substituído.');
    if (record.state !== 'DRAFT_NEEDS_REVIEW') throw new Error('Execução anterior incompleta para ' + spec.key + ', ID: ' + (record.id || 'não registrado') + '. Conferir manualmente; não criar outro formulário.');
    const form = FormApp.openById(record.id);
    return { key: spec.key, id: record.id, editUrl: form.getEditUrl(), state: record.state, reused: true };
  }
  // Record intent BEFORE editing. If interrupted, refuse another population.
  properties.setProperty(propertyKey, JSON.stringify({ state: 'STARTING', hash: hash, id: spec.existingFormId }));
  const form = FormApp.openById(spec.existingFormId);
  const blankItem = assertEmptyDraft_(form, spec.title);
  if (!form.supportsAdvancedResponderPermissions()) throw new Error('Não foi possível garantir rascunho não publicado; conferir manualmente.');
  form.setPublished(false);
  if (blankItem) form.deleteItem(blankItem);
  form.setTitle(spec.title);
  properties.setProperty(propertyKey, JSON.stringify({ state: 'BUILDING', hash: hash, id: form.getId() }));
  if (spec.description !== undefined) form.setDescription(spec.description);
  const pages = Object.create(null);
  const choiceItems = [];
  spec.sections.forEach((section, index) => {
    let header = null;
    if (index > 0) {
      header = form.addPageBreakItem().setTitle(section.title || '');
      pages[section.key] = header;
    } else if (section.title || section.description) {
      header = form.addSectionHeaderItem().setTitle(section.title || '');
    }
    if (header && section.description !== undefined) header.setHelpText(section.description);
    section.items.forEach(question => {
      const creators = {
        TEXT: 'addTextItem', PARAGRAPH: 'addParagraphTextItem', CHOICE: 'addMultipleChoiceItem',
        DROPDOWN: 'addListItem', SCALE: 'addScaleItem', SECTION_HEADER: 'addSectionHeaderItem',
      };
      const item = form[creators[question.type]]().setTitle(question.title);
      if (question.type !== 'SECTION_HEADER') item.setRequired(question.required);
      if (question.description !== undefined) item.setHelpText(question.description);
      if (question.type === 'SCALE') {
        item.setBounds(question.min, question.max);
        if (question.lowLabel !== undefined || question.highLabel !== undefined) item.setLabels(question.lowLabel || '', question.highLabel || '');
      }
      if (question.type === 'CHOICE' || question.type === 'DROPDOWN') choiceItems.push({ item: item, question: question });
    });
  });
  choiceItems.forEach(entry => {
    const options = entry.question.options;
    const routed = options.every(option => typeof option.target === 'string');
    entry.item.setChoices(options.map(option => routed
      ? entry.item.createChoice(option.value, navigation_(option.target, pages))
      : entry.item.createChoice(option.value)));
  });
  // A page break controls navigation from the PRECEDING page, not its own page.
  spec.sections.slice(0, -1).forEach((section, index) => {
    pages[spec.sections[index + 1].key].setGoToPage(navigation_(section.next === null ? 'SUBMIT' : section.next, pages));
  });
  properties.setProperty(propertyKey, JSON.stringify({ state: 'DRAFT_NEEDS_REVIEW', hash: hash, id: form.getId() }));
  return { key: spec.key, id: form.getId(), editUrl: form.getEditUrl(), state: 'DRAFT_NEEDS_REVIEW', reused: false };
}

function assertEmptyDraft_(form, expectedTitle) {
  const title = form.getTitle().trim();
  if (!['', 'Formulário sem título', 'Untitled form', expectedTitle].includes(title) || form.getDescription().trim()) throw new Error('Formulário de destino contém conteúdo; nada será apagado.');
  const items = form.getItems();
  if (items.length === 0) return null;
  if (items.length !== 1 || items[0].getType() !== FormApp.ItemType.MULTIPLE_CHOICE) throw new Error('Formulário não está vazio; nada será apagado.');
  const item = items[0].asMultipleChoiceItem();
  const choices = item.getChoices();
  if (!['', 'Pergunta sem título', 'Untitled Question'].includes(item.getTitle().trim()) || item.getHelpText().trim() || item.isRequired()
    || choices.length > 1 || choices.some(choice => !['', 'Opção 1', 'Option 1'].includes(choice.getValue().trim()))) throw new Error('Pergunta existente não é o padrão vazio; nada será apagado.');
  return items[0];
}

function navigation_(target, pages) {
  return target === 'CONTINUE' || target === 'SUBMIT' ? FormApp.PageNavigationType[target] : pages[target];
}

function validateBlueprint_(blueprint) {
  function require_(condition, message) { if (!condition) throw new Error(message); }
  function text_(value) { return typeof value === 'string' && value.trim().length > 0; }
  require_(blueprint && Array.isArray(blueprint.forms) && blueprint.forms.length === 2, 'Preencha o blueprint conferido dos dois formulários antes de executar.');
  const warnings = ['Revisar configurações não inferidas: coleta de e-mail, acesso, limite/edição de respostas, confirmação e identidade visual. Rascunhos não publicados. Destinos desconhecidos usam SUBMIT somente como proteção temporária do rascunho; não representam as rotas originais.'];
  const formKeys = new Set();
  blueprint.forms.forEach(spec => {
    require_(spec && /^[a-z0-9_-]+$/.test(spec.key) && !formKeys.has(spec.key), 'Chave de formulário inválida ou duplicada.');
    formKeys.add(spec.key);
    require_(text_(spec.title) && Array.isArray(spec.sections) && spec.sections.length > 0, 'Título ou seções ausentes.');
    if (spec.description !== undefined) require_(typeof spec.description === 'string', 'Descrição de formulário inválida.');
    require_(/^[A-Za-z0-9_-]{20,200}$/.test(spec.existingFormId || ''), 'Informe o ID do rascunho existente; este script não cria formulários.');
    const sections = new Set();
    spec.sections.forEach(section => {
      require_(section && text_(section.key) && !sections.has(section.key) && !['CONTINUE', 'SUBMIT'].includes(section.key), 'Chave de seção inválida ou duplicada.');
      sections.add(section.key);
    });
    function route_(target) { return target === 'CONTINUE' || target === 'SUBMIT' || (sections.has(target) && target !== spec.sections[0].key); }
    const questionKeys = new Set();
    spec.sections.forEach((section, index) => {
      require_(Array.isArray(section.items), 'Itens ausentes na seção ' + section.key + '.');
      ['title', 'description'].forEach(field => {
        if (section[field] !== undefined) require_(typeof section[field] === 'string', 'Texto de seção inválido.');
      });
      require_(section.next === null || route_(section.next), 'Destino de seção ausente ou inválido: ' + section.key + '.');
      require_(index !== spec.sections.length - 1 || section.next === null || section.next === 'SUBMIT', 'Última seção deve enviar ou ficar com destino pendente.');
      if (section.next === null) warnings.push(spec.key + '/' + section.key + ': destino da seção não confirmado.');
      section.items.forEach(question => {
        require_(question && text_(question.key) && !questionKeys.has(question.key), 'Chave de pergunta inválida ou duplicada.');
        questionKeys.add(question.key);
        require_(text_(question.title) && (question.type === 'SECTION_HEADER' || typeof question.required === 'boolean'), 'Título/obrigatoriedade não confirmados: ' + question.key + '.');
        require_(['TEXT', 'PARAGRAPH', 'CHOICE', 'DROPDOWN', 'SCALE', 'SECTION_HEADER'].includes(question.type), 'Tipo de pergunta não suportado: ' + question.key + '.');
        if (question.description !== undefined) require_(typeof question.description === 'string', 'Descrição de pergunta inválida.');
        if (question.type === 'SCALE') {
          require_(question.min === 1 && question.max === 4, 'Confirme a escala 1–4: ' + question.key + '.');
          ['lowLabel', 'highLabel'].forEach(field => {
            if (question[field] !== undefined) require_(typeof question[field] === 'string', 'Rótulo de escala inválido.');
          });
        }
        if (question.type === 'CHOICE' || question.type === 'DROPDOWN') {
          require_(Array.isArray(question.options) && question.options.length > 0, 'Alternativas ausentes: ' + question.key + '.');
          const values = new Set();
          question.options.forEach(option => {
            require_(option && text_(option.value) && !values.has(option.value), 'Alternativa vazia ou duplicada: ' + question.key + '.');
            values.add(option.value);
            require_(option.target === undefined || option.target === null || route_(option.target), 'Destino de alternativa inválido: ' + question.key + '.');
          });
          const routed = question.options.some(option => typeof option.target === 'string');
          require_(!routed || question.options.every(option => typeof option.target === 'string'), 'Não misture alternativas com e sem navegação: ' + question.key + '.');
          require_(!routed || index < spec.sections.length - 1, 'Navegação por alternativa não funciona na última página: ' + question.key + '.');
          if (question.options.some(option => option.target === null)) warnings.push(spec.key + '/' + question.key + ': destinos de alternativas não confirmados.');
        }
      });
    });
  });
  return warnings;
}
