import type { AppData, EvaluationResponse } from './types';
import { KIND_LABELS } from './types';
import { formatDate, formatNumber, reportResponses, responseAverage } from './analytics';

interface Filters { cycleId: string; evaluationId?: string; employeeId?: string }
export function saveFile(bytes: Uint8Array, type: string, name: string) {
  const blob = new Blob([new Uint8Array(bytes)], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href=url;link.download=name;
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10_000);
}
export const pdfText = (text: string) => text.normalize('NFC').replace(/→|↔/g,' > ').replace(/[^\x20-\x7E\u00A0-\u00FF]/g,' ');

export async function downloadReport(data: AppData, filters: Filters, format: 'pdf'|'xlsx', demo = false): Promise<void> {
  const cycle=data.cycles.find(cycle=>cycle.id===filters.cycleId);
  if(!cycle) throw new Error('Selecione um ciclo para gerar o relatório.');
  const rows=reportResponses(data,filters);
  if(!rows.length) throw new Error('Não há respostas para os filtros selecionados.');
  const evaluations=new Map(data.evaluations.map(evaluation=>[evaluation.id,evaluation]));
  const employees=new Map(data.employees.map(employee=>[employee.id,employee]));
  const name=(id:string)=>employees.get(id)?.name??'Cadastro indisponível';
  const selectedEvaluation=filters.evaluationId?evaluations.get(filters.evaluationId):undefined;
  const prefix=`Cardiofitness_${cycle.startDate}_${filters.employeeId?'individual':'avaliacoes'}`;
  if(format==='xlsx') {
    const ExcelJS=(await import('exceljs')).default;
    const book=new ExcelJS.Workbook();book.creator='Cardiofitness';book.created=new Date();
    const summary=book.addWorksheet('Resumo');
    summary.columns=[{header:'Informação',key:'label',width:34},{header:'Valor',key:'value',width:64}];
    summary.addRows([{label:'Empresa',value:'Cardiofitness'},{label:'Ciclo',value:cycle.name},{label:'Período',value:`${formatDate(cycle.startDate)} a ${formatDate(cycle.endDate)}`},{label:'Formulário',value:selectedEvaluation?.name??'Todos os formulários'},{label:'Pessoa avaliada',value:filters.employeeId?name(filters.employeeId):'Todas as pessoas'},{label:'Respostas no relatório',value:rows.length},{label:'Origem',value:demo?'Demonstração com dados fictícios':'Respostas identificadas do Google Forms'},{label:'Observação',value:'Médias separadas por formulário; escalas conforme as perguntas de origem.'}]);
    const sheet=book.addWorksheet('Respostas',{views:[{state:'frozen',ySplit:1}]});
    sheet.columns=[{header:'Ciclo',key:'cycle',width:26},{header:'Formulário',key:'form',width:40},{header:'Tipo',key:'kind',width:26},{header:'Pessoa avaliada',key:'subject',width:30},{header:'Respondente',key:'respondent',width:30},{header:'Setor da pessoa avaliada',key:'department',width:27},{header:'Data da resposta',key:'date',width:20},{header:'Média',key:'average',width:13},{header:'Escala',key:'scale',width:14}];
    const detail=book.addWorksheet('Notas por pergunta',{views:[{state:'frozen',ySplit:1}]});
    detail.columns=[{header:'Ciclo',key:'cycle',width:26},{header:'Formulário',key:'form',width:40},{header:'Pessoa avaliada',key:'subject',width:30},{header:'Respondente',key:'respondent',width:30},{header:'Data',key:'date',width:18},{header:'Pergunta',key:'question',width:80},{header:'Nota',key:'score',width:12},{header:'Mínimo',key:'min',width:12},{header:'Máximo',key:'max',width:12}];
    const feedback=book.addWorksheet('Respostas de texto',{views:[{state:'frozen',ySplit:1}]});
    feedback.columns=[{header:'Ciclo',key:'cycle',width:26},{header:'Formulário',key:'form',width:40},{header:'Pessoa avaliada',key:'subject',width:30},{header:'Respondente',key:'respondent',width:30},{header:'Perspectiva',key:'kind',width:26},{header:'Data',key:'date',width:18},{header:'Pergunta',key:'question',width:70},{header:'Texto',key:'answer',width:100}];
    rows.forEach(row=>{
      const evaluation=evaluations.get(row.evaluationId)!;
      const scale=evaluation.mapping.scoreQuestions[0];
      const base={cycle:cycle.name,form:evaluation.name,subject:name(row.subjectId),respondent:name(row.respondentId),date:formatDate(row.submittedAt)};
      sheet.addRow({...base,kind:KIND_LABELS[row.kind],department:employees.get(row.subjectId)?.department??'',average:responseAverage(row),scale:scale?`${scale.min} a ${scale.max}`:'—'});
      row.textAnswers?.filter(item=>item.answer.trim()).forEach(item=>feedback.addRow({...base,kind:KIND_LABELS[row.kind],question:item.question,answer:item.answer}));
      Object.entries(row.scores).forEach(([questionId,score])=>{
        const question=evaluation.mapping.scoreQuestions.find(question=>question.id===questionId);
        detail.addRow({...base,question:question?.title??questionId,score,min:question?.min??null,max:question?.max??null});
      });
    });
    for(const sheet of [summary,detail,feedback,book.getWorksheet('Respostas')!]) {
      sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};
      sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF163064'}};
      sheet.getRow(1).height=25;
      sheet.autoFilter={from:{row:1,column:1},to:{row:sheet.rowCount,column:sheet.columnCount}};
      sheet.eachRow((row,index)=>{if(index>1){row.alignment={vertical:'middle',wrapText:true};if(index%2===0)row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFEFF6FE'}};}});
    }
    sheet.getColumn('average').numFmt='0.00';
    const bytes=await book.xlsx.writeBuffer();
    saveFile(new Uint8Array(bytes),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',`${prefix}.xlsx`);
    return;
  }
  const {PDFDocument,StandardFonts,rgb}=await import('pdf-lib');
  const pdf=await PDFDocument.create();pdf.setTitle('Cardiofitness - Relatório de avaliações');pdf.setAuthor('Cardiofitness');
  const font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink=rgb(.09,.19,.39),green=rgb(.09,.19,.39),muted=rgb(.36,.40,.46),pale=rgb(.94,.96,1);
  const width=841.89,height=595.28,margin=38;
  let page=pdf.addPage([width,height]),y=0,pageIndex=0;
  function draw(text:string,x:number,top:number,size=10,isBold=false,fill=ink){page.drawText(pdfText(text),{x,y:height-top-size,size,font:isBold?bold:font,color:fill});}
  function wrap(text:string,maxWidth:number,size=9,isBold=false){
    const chosen=isBold?bold:font;const words=pdfText(text).split(/\s+/);const lines:string[]=[];let row='';
    for(let word of words){
      while(chosen.widthOfTextAtSize(word,size)>maxWidth){const max=Math.max(1,Math.floor(word.length*maxWidth/chosen.widthOfTextAtSize(word,size))-1);if(row){lines.push(row);row='';}lines.push(word.slice(0,max));word=word.slice(max);}
      const candidate=row?`${row} ${word}`:word;if(row&&chosen.widthOfTextAtSize(candidate,size)>maxWidth){lines.push(row);row=word;}else row=candidate;
    }
    if(row)lines.push(row);return lines.length?lines:[''];
  }
  const columns=[{x:margin,width:171,label:'PESSOA AVALIADA'},{x:margin+177,width:171,label:'RESPONDENTE'},{x:margin+354,width:159,label:'TIPO'},{x:margin+519,width:149,label:'FORMULÁRIO'},{x:margin+674,width:80,label:'MÉDIA'}];
  function header(){
    pageIndex++;page.drawRectangle({x:0,y:height-76,width,height:76,color:green});draw('Cardiofitness',margin,23,21,true,rgb(1,1,1));draw('RELATÓRIO DE AVALIAÇÕES',width-245,31,11,true,rgb(1,1,1));
    const cycleLines=wrap(cycle!.name,width-margin*2,18,true);
    cycleLines.forEach((text,index)=>draw(text,margin,99+index*22,18,true));
    let top=99+cycleLines.length*22+7;
    draw(`${formatDate(cycle!.startDate)} a ${formatDate(cycle!.endDate)}  |  ${rows.length} respostas identificadas`,margin,top,10,false,muted);top+=20;
    const formLines=wrap(selectedEvaluation?.name??'Todos os formulários',width-margin*2,10,true);
    formLines.forEach((text,index)=>draw(text,margin,top+index*14,10,true,green));top+=formLines.length*14+4;
    const personLines=wrap(filters.employeeId?`Pessoa: ${name(filters.employeeId)}`:'Todas as pessoas avaliadas',width-margin*2,10);
    personLines.forEach((text,index)=>draw(text,margin,top+index*14,10,false,muted));
    y=top+personLines.length*14+19;page.drawRectangle({x:margin,y:height-y-27,width:width-margin*2,height:27,color:pale});
    columns.forEach(column=>draw(column.label,column.x+5,y+9,8,true,green));y+=35;
  }
  header();
  rows.forEach((row:EvaluationResponse,index)=>{
    const evaluation=evaluations.get(row.evaluationId)!;
    const values=[name(row.subjectId),name(row.respondentId),KIND_LABELS[row.kind],evaluation.name,formatNumber(responseAverage(row))];
    const wrapped=values.map((value,i)=>wrap(value,columns[i].width-10,9,i===0));
    const rowHeight=Math.max(...wrapped.map(lines=>lines.length))*13+24;
    if(y+rowHeight>height-53){page=pdf.addPage([width,height]);header();}
    if(index%2===0)page.drawRectangle({x:margin,y:height-y-rowHeight,width:width-margin*2,height:rowHeight,color:rgb(.97,.98,1)});
    wrapped.forEach((lines,i)=>lines.forEach((text,j)=>draw(text,columns[i].x+5,y+7+j*13,9,i===0)));
    draw(`Resposta em ${formatDate(row.submittedAt)}`,margin+5,y+rowHeight-13,8,false,muted);y+=rowHeight;
  });
  if(rows.length){
    function detailPage(){
      page=pdf.addPage([width,height]);
      pageIndex++;
      page.drawRectangle({x:0,y:height-52,width,height:52,color:green});
      draw('Cardiofitness',margin,17,18,true,rgb(1,1,1));
      draw('ANÁLISE DETALHADA: NOTAS POR CRITÉRIO E FEEDBACKS',width-390,22,10,true,rgb(1,1,1));
      y=72;
    }
    function drawLine(text:string,isBold=false,indent=0,color=ink,size=9){
      if(y+14>height-48) detailPage();
      draw(text,margin+indent,y,size,isBold,color);
      y+=13;
    }
    function writeParagraph(text:string,maxWidth=width-margin*2-28,isBold=false,indent=18,color=ink,size=8.5){
      for(const rawLine of text.split(/\r?\n/)){
        for(const line of wrap(rawLine,maxWidth,size,isBold)){
          if(y+13>height-48) detailPage();
          draw(line,margin+indent,y,size,isBold,color);
          y+=12;
        }
      }
    }

    detailPage();

    for(const row of rows){
      const evaluation=evaluations.get(row.evaluationId)!;
      const respName=name(row.respondentId);
      const subjName=name(row.subjectId);
      const avg=responseAverage(row);

      if(y+55>height-48) detailPage();

      page.drawRectangle({x:margin,y:height-y-24,width:width-margin*2,height:24,color:pale});
      draw(subjName,margin+8,y+6,11,true,green);
      const subtitleText=`Avaliado por: ${row.kind==='self'?'Própria pessoa (Autoavaliação)':respName}  |  ${KIND_LABELS[row.kind]}  |  ${formatDate(row.submittedAt)}`;
      draw(subtitleText,margin+8+bold.widthOfTextAtSize(pdfText(subjName),11)+16,y+7,8.5,false,muted);
      draw(`MÉDIA: ${formatNumber(avg)} / 4`,width-margin-90,y+6,9.5,true,green);
      y+=30;

      const questions=evaluation?.mapping?.scoreQuestions||[];
      if(questions.length){
        drawLine('Notas por critério avaliado (Escala 1 a 4):',true,6,green,8);
        y+=2;
        for(const q of questions){
          const score=row.scores[q.id];
          const scoreStr=score!==undefined?`${score.toFixed(1)} / 4`:'—';
          const qText=`• ${q.title}`;
          const qLines=wrap(qText,width-margin*2-80,8.5,false);
          qLines.forEach((line,lineIdx)=>{
            if(y+13>height-48) detailPage();
            draw(line,margin+12,y,8.5,false,ink);
            if(lineIdx===0){
              draw(scoreStr,width-margin-65,y,8.5,true,green);
            }
            y+=12;
          });
        }
      }

      const validTexts=(row.textAnswers||[]).filter(a=>a.answer&&a.answer.trim());
      if(validTexts.length>0){
        y+=2;
        drawLine('Feedbacks e comentários registrados:',true,6,green,8);
        y+=2;
        for(const ans of validTexts){
          drawLine(`${ans.question||'Observações'}:`,true,12,muted,8);
          writeParagraph(ans.answer,width-margin*2-24,false,14,ink,8.5);
          y+=2;
        }
      }

      y+=12;
    }
  }
  pdf.getPages().forEach((p,i)=>{
    page=p;draw(`${demo?'DADOS FICTÍCIOS | ':''}Cardiofitness | Acesso exclusivo do RH | Médias conforme a escala de cada formulário`,margin,height-30,8,false,muted);
    draw(`${i+1} / ${pageIndex}`,width-72,height-30,8,true,muted);
  });
  const bytes=await pdf.save();saveFile(bytes,'application/pdf',`${prefix}.pdf`);
}
