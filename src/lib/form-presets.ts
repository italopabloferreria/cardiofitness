import type { FormMapping, EvaluationKind } from './types';

// IDs e perguntas conferidos na Forms API; comentários livres não são importados.
export const PROVIDED_FORMS: {name:string;kind:EvaluationKind;googleFormId:string;url:string;mapping:FormMapping}[] = [
  {
    "name": "Avaliação de líderes",
    "kind": "leadership",
    "googleFormId": "1crkqvvjyDrSUu7C0SHhS0le7_x89CPPQEJCAIY8BTso",
    "url": "https://docs.google.com/forms/d/e/1FAIpQLScI5us346mhyabPreE4ly7CXXZYBn5wwYBbXj6HJOGHErDpYQ/viewform",
    "mapping": {
      "respondentQuestionIds": [
        "53288552"
      ],
      "subjectQuestionIds": [
        "32c80244"
      ],
      "departmentQuestionIds": [
        "7c309a7d"
      ],
      "scoreQuestions": [
        {
          "id": "1860caa3",
          "title": "O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?",
          "min": 1,
          "max": 4
        },
        {
          "id": "08d6ea80",
          "title": "O funcionário tem desempenhado bem sua função?",
          "min": 1,
          "max": 4
        },
        {
          "id": "3321e5a8",
          "title": "Passa as informações necessárias para seu grupo de trabalho?",
          "min": 1,
          "max": 4
        },
        {
          "id": "43bd2532",
          "title": "Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?",
          "min": 1,
          "max": 4
        },
        {
          "id": "3bcd842e",
          "title": "Consegue influenciar os demais colaboradores e motivá-los a participar das atividades propostas?",
          "min": 1,
          "max": 4
        },
        {
          "id": "485e3858",
          "title": "Entende a diversidade de personalidades e consegue despertar o melhor de cada uma?",
          "min": 1,
          "max": 4
        },
        {
          "id": "580fe4fc",
          "title": "O funcionário reflete os valores da empresa?",
          "min": 1,
          "max": 4
        }
      ]
    }
  },
  {
    "name": "Avaliação e autoavaliação da equipe",
    "kind": "team",
    "googleFormId": "1ugPS-wx1YVdOHYXXH-xbKCkSQk1ZhMF9g1h80n0X4hU",
    "url": "https://docs.google.com/forms/d/e/1FAIpQLSeoKb2fBDMF0te3XNKtp22Gy_oZifnCTER3sSOVvuarDOs-sQ/viewform",
    "mapping": {
      "respondentQuestionIds": [
        "26043e5f",
        "49e74424",
        "55615372",
        "1a023f2f",
        "203c49f1"
      ],
      "subjectQuestionIds": [
        "4bbe8fe9",
        "118d174b",
        "53c8115b",
        "2d0b8252",
        "41eb6ab5"
      ],
      "departmentQuestionIds": [
        "12f8f9bd"
      ],
      "scoreQuestions": [
        {
          "id": "0f032f04",
          "title": "O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?",
          "min": 1,
          "max": 4
        },
        {
          "id": "54986001",
          "title": "O funcionário tem conhecimento amplo dos convênios que fatura/autoriza?",
          "min": 1,
          "max": 4
        },
        {
          "id": "389ee820",
          "title": "Passa as informações necessárias para seu grupo de trabalho?",
          "min": 1,
          "max": 4
        },
        {
          "id": "0ca8df14",
          "title": "Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?",
          "min": 1,
          "max": 4
        },
        {
          "id": "2d3521ff",
          "title": "O funcionário tem domínio do software MedWare?",
          "min": 1,
          "max": 4
        },
        {
          "id": "042adbdd",
          "title": "O funcionário tem domínio dos sites dos convênios que fatura/autoriza?",
          "min": 1,
          "max": 4
        },
        {
          "id": "565f9bbd",
          "title": "O funcionário reflete os valores da empresa?",
          "min": 1,
          "max": 4
        },
        {
          "id": "3abc980d",
          "title": "O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?",
          "min": 1,
          "max": 4
        },
        {
          "id": "6ac81b86",
          "title": "O funcionário tem conhecimento dos convênios credenciados, consultas, exames e respectivos valores?",
          "min": 1,
          "max": 4
        },
        {
          "id": "6a675705",
          "title": "Passa as informações necessárias para seu grupo de trabalho?",
          "min": 1,
          "max": 4
        },
        {
          "id": "548cb1ce",
          "title": "Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?",
          "min": 1,
          "max": 4
        },
        {
          "id": "314bb69e",
          "title": "O funcionário tem domínio do software MedWare?",
          "min": 1,
          "max": 4
        },
        {
          "id": "03165716",
          "title": "O funcionário tem domínio do software da Fasterisks?",
          "min": 1,
          "max": 4
        },
        {
          "id": "1adea9b5",
          "title": "O funcionário reflete os valores da empresa?",
          "min": 1,
          "max": 4
        },
        {
          "id": "2c75f714",
          "title": "O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?",
          "min": 1,
          "max": 4
        },
        {
          "id": "42f7ca35",
          "title": "O funcionário tem conhecimento dos convênios credenciados, consultas, exames e respectivos valores? ////// O funcionário tem conhecimento técnico dos exames da empresa?",
          "min": 1,
          "max": 4
        },
        {
          "id": "27a2a673",
          "title": "Passa as informações necessárias para seu grupo de trabalho?",
          "min": 1,
          "max": 4
        },
        {
          "id": "231f32a9",
          "title": "Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?",
          "min": 1,
          "max": 4
        },
        {
          "id": "20e9c5bb",
          "title": "O funcionário tem domínio do software MedWare?",
          "min": 1,
          "max": 4
        },
        {
          "id": "6d31a858",
          "title": "O funcionário reflete os valores da empresa?",
          "min": 1,
          "max": 4
        },
        {
          "id": "16a798ff",
          "title": "O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?",
          "min": 1,
          "max": 4
        },
        {
          "id": "0676c922",
          "title": "O funcionário tem conhecimento técnico dos exames da empresa?",
          "min": 1,
          "max": 4
        },
        {
          "id": "719564ff",
          "title": "Passa as informações necessárias para seu grupo de trabalho?",
          "min": 1,
          "max": 4
        },
        {
          "id": "0a20911f",
          "title": "Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?",
          "min": 1,
          "max": 4
        },
        {
          "id": "28922ee6",
          "title": "O funcionário tem domínio do software MedWare?",
          "min": 1,
          "max": 4
        },
        {
          "id": "3247601e",
          "title": "O funcionário reflete os valores da empresa?",
          "min": 1,
          "max": 4
        },
        {
          "id": "609372fe",
          "title": "O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?",
          "min": 1,
          "max": 4
        },
        {
          "id": "225797fb",
          "title": "O funcionário tem desempenhado bem sua função?",
          "min": 1,
          "max": 4
        },
        {
          "id": "34d557b0",
          "title": "Passa as informações necessárias para seu grupo de trabalho?",
          "min": 1,
          "max": 4
        },
        {
          "id": "3bc8422c",
          "title": "Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?",
          "min": 1,
          "max": 4
        },
        {
          "id": "493bb990",
          "title": "O funcionário reflete os valores da empresa?",
          "min": 1,
          "max": 4
        }
      ]
    }
  }
];
