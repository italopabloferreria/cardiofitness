# Divergências do cadastro por setor

Comparação em 8 de outubro de 2026. Fonte: `C:/Users/italo/Programação/Cadiofitness/TODOS OS COLABORADORES POR SETORES DA EMPRESA.pdf`, página 1, SHA-256 `7d2010ebf6f66a716093fa0161e1fd6f57faa1602470914fe9779a59511456d7`. Blueprint comparado: `google-forms/formularios-blueprint.json`, SHA-256 `5eac589411519a592eaf1ec7b71f173201476d0ef36ba6a55ef135fa8bb68788`.

PDF extraído por tabela e conferido na renderização da página inteira: **28 linhas de colaboradores, seis setores e cinco rótulos distintos de liderança**. O documento não informa data de vigência, e-mail ou status. Não autoriza alterar cadastros nem nomes dos formulários por inferência. Dados não foram importados nem nomes substituídos.

A comparação exata abaixo ignora apenas caixa e acentos. Nomes completos e abreviados continuam diferentes. O vínculo entre setores é apenas correspondência de assunto para revisão, nunca associação automática de pessoas.

## FATURAMENTO E AUXILIARES DE FATURAMENTO

PDF: “ANA KAROLINA RIBEIRO ALVES VIANA”; “BRUNA ALVES BARBOSA”; “RAYANE”; “YASMIN”; “adriele”. Liderança escrita: **LIDIA VIANA**.

Forms, Faturamento, “Qual o seu nome?”: “Ana”; “Bruna”; “Rayane”; “Sabrina”. Coincidências exatas normalizadas com PDF: “RAYANE”.
Forms, Faturamento, “Quem você irá avaliar??”: “Ana”; “Bruna”; “Rayane”; “Sabrina”. Coincidências exatas normalizadas com PDF: “RAYANE”.

## COPEIRAS

PDF: “MARIA DO SOCORRO”. Liderança escrita: **CLEUMA**.

Sem seção diretamente correspondente no blueprint. Não assumir que Copa corresponde a Limpeza, nem atribuir ADM a outro setor.

## CENTRAL E RESULTADOS DE EXAMES

PDF: “Hellen Silva Rodrigues”; “LUCIANA”; “Rute dos Santos Silva”; “JOELSON”; “paulo”. Liderança escrita: **GABRIEL**.

Forms, Central/Resultado, “Qual o seu nome?”: “Rute”; “Hellen Silva”; “Alice”; “Joelson”; “Emanuele”; “Luciana”. Coincidências exatas normalizadas com PDF: “LUCIANA”; “JOELSON”.
Forms, Central/Resultado, “Quem você irá avaliar??”: “Rute”; “Hellen Silva”; “Alice”; “Joelson”; “Emanuele”; “Luciana”. Coincidências exatas normalizadas com PDF: “LUCIANA”; “JOELSON”.

## TÉCNICAS E CORREDOR

PDF: “DAIANE RAMOS DOS SANTOS”; “Eliane Batista de Souza”; “Luzia de Moraes Castro”; “MARIA SULAMI RIBEIRO DE ANDRADE”; “Onizete Vieira da Silva-”; “Renilda Maria Pereira da Silva”; “Solange Borges Pimentel”; “luiza”; “sara”. Liderança escrita: **CLEUMA**.

Forms, Técnicas de Exame/Corredor, “Qual o seu nome?”: “Sulami”; “Renilda”; “Roni”; “Eliane”; “Luzia”; “Daiane Ramos”; “Júlia”. Coincidências exatas normalizadas com PDF: nenhum.
Forms, Técnicas de Exame/Corredor, “Quem você irá avaliar?”: “Eliane”; “Daiane Ramos”; “Luzia”; “Renilda”; “Roni”; “Sulami”; “Júlia”. Coincidências exatas normalizadas com PDF: nenhum.

## RECEPÇÃO E TRIAGEM

PDF: “LUCAS DOS SANTOS REIS”; “Jaqueline Alves Ribeiro”; “DAYANE MARES”; “JULIA SANTOS”; “KEZIA”; “MARIA LUIZA 2.”; “BRENO”. Liderança escrita: **WELISSON**.

Forms, Recepção/Triagem, “Qual o seu nome?”: “Dayane Mares”; “Gabriel”; “Lucas”; “Jaqueline”; “Thiago”; “Ana Karoline”. Coincidências exatas normalizadas com PDF: “DAYANE MARES”.
Forms, Recepção/Triagem, “Quem você irá avaliar??”: “Dayane Mares”; “Gabriel”; “Lucas”; “Jaqueline”; “Ana Karoline”. Coincidências exatas normalizadas com PDF: “DAYANE MARES”.

## ADM

PDF: “ana carolina reis”. Liderança escrita: **MARIA**.

Sem seção diretamente correspondente no blueprint. Não assumir que Copa corresponde a Limpeza, nem atribuir ADM a outro setor.

## Diferenças que exigem decisão humana

- Faturamento: PDF traz “YASMIN” e “adriele”, ausentes nas listas do setor; Forms traz “Sabrina”, ausente nesse setor do PDF. “Ana”/“Ana Karolina” e “Bruna” podem ser abreviações de nomes completos, sem confirmação de identidade.
- Central: “paulo” consta no PDF e não na lista do setor; “Alice” e “Emanuele” constam no Forms e não nesse setor do PDF. “Hellen Silva” e “Rute” podem ser abreviações dos nomes completos, sem confirmação.
- Técnicas: PDF traz “Onizete Vieira da Silva-”, “Solange Borges Pimentel”, “luiza” e “sara”, ausentes na lista do setor; Forms traz “Roni” e “Júlia”, ausentes nesse setor do PDF. “Solange” existe na identificação geral de Líderes, mas não na seção de equipe. “luiza” e “Luzia de Moraes Castro” são duas linhas diferentes do PDF; não fundir.
- Recepção: PDF traz “JULIA SANTOS”, “KEZIA”, “MARIA LUIZA 2.” e “BRENO”, ausentes na lista do setor. Forms traz “Gabriel”, “Thiago” e “Ana Karoline”, ausentes nesse setor do PDF. “Thiago” aparece apenas como respondente, não como avaliado. “Júlia” aparece em Técnicas no Forms; isso não confirma identidade nem mudança de setor de JULIA SANTOS.
- Copa: PDF vincula “MARIA DO SOCORRO” a CLEUMA. Forms tem setor Limpeza com “Maria Socorro” e “Maria da Luz”. São rótulos de setor e nome diferentes; não transferir pessoa ou vínculo automaticamente.
- ADM: PDF registra “ana carolina reis” sob MARIA; não há seção ADM no blueprint. Não confundir “ana carolina reis”, “ANA KAROLINA RIBEIRO ALVES VIANA” e a opção “Ana Karoline”.
- Lideranças: PDF registra LIDIA VIANA, CLEUMA, GABRIEL, WELISSON e MARIA. O formulário Líderes oferece “Lídia”, “Cleuma”, “Welisson” e “Natacha”. “Natacha” não consta como líder no PDF; GABRIEL e MARIA não constam nas alternativas de liderança. “Lídia” e LIDIA VIANA exigem alias confirmado.
- Grafia: identificação geral de Líderes usa “Helen Silva”; seção de equipe usa “Hellen Silva”; PDF usa “Hellen Silva Rodrigues”. Não corrigir silenciosamente.

## Limites e preservação

O PDF permanece intacto. O JSON preserva cada nome como escrito e lideranças conforme as células mescladas da tabela. Não há alias, status ativo/inativo ou e-mail deduzido. Alguns nomes estão em minúsculas ou contêm marcas que podem ser erro de cadastro; foram mantidos. Fonte de cadastro e formulários podem refletir momentos diferentes, não há data para escolher automaticamente qual prevalece.

A nota trata somente da composição das listas. Não permite inferir as páginas finais, destinos Sim/Não ou configurações privadas. Para fidelidade dos formulários, preservar as alternativas observadas até orientação explícita sobre atualização de cadastros.

As páginas finais e os destinos Sim/Não foram posteriormente conferidos por navegação pública, sem envio de respostas, e reproduzidos nas cópias. Evidências em `verificacao-final.json` e `rotas-originais-verificadas.json`; essa conferência não alterou nomes ou vínculos do PDF.
