import type { ParticipationRow } from './participation';
import { saveFile, pdfText } from './export';
export const PARTICIPATION_STATUS = {not_started:'Não iniciou',partial:'Parcial',completed:'Concluído',unconfigured:'A conferir (não confirmado)'};
export function pendingExportRows(rows: ParticipationRow[]) {
  return rows.map(row=>({respondent:row.employee.name,form:row.evaluation.name,department:row.employee.department,status:PARTICIPATION_STATUS[row.status],expected:row.status==='unconfigured'?null:row.expected,completed:row.status==='unconfigured'?null:row.completed,pending:row.status==='unconfigured'?null:row.pendingSubjects.length,subjects:row.status==='unconfigured'?'':row.pendingSubjects.map(person=>person.name).join('\n')}));
}
export async function downloadPending(rows: ParticipationRow[], cycleName: string, format: 'pdf'|'xlsx') {
  if(!rows.length) throw new Error('Não há participantes no recorte selecionado.');
  const records=pendingExportRows(rows);
  if(format==='xlsx'){
    const ExcelJS=(await import('exceljs')).default;const book=new ExcelJS.Workbook();book.creator='Cardiofitness';
    const sheet=book.addWorksheet('Pendências',{views:[{state:'frozen',ySplit:1}]});
    sheet.columns=[{header:'Respondente',key:'respondent',width:35},{header:'Formulário',key:'form',width:40},{header:'Setor',key:'department',width:25},{header:'Situação',key:'status',width:26},{header:'Esperadas',key:'expected',width:12},{header:'Concluídas',key:'completed',width:12},{header:'Faltantes',key:'pending',width:12},{header:'Pessoas que faltam avaliar',key:'subjects',width:60}];
    sheet.addRows(records);sheet.eachRow(row=>{row.alignment={wrapText:true,vertical:'top'};});sheet.getRow(1).font={bold:true};sheet.autoFilter={from:'A1',to:`H${sheet.rowCount}`};
    saveFile(new Uint8Array(await book.xlsx.writeBuffer()),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Cardiofitness_Pendencias.xlsx');return;
  }
  const {PDFDocument,StandardFonts,rgb}=await import('pdf-lib');const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica);const bold=await pdf.embedFont(StandardFonts.HelveticaBold);let page=pdf.addPage(),y=780;
  function next(){page=pdf.addPage();y=780;}
  function line(value:string,isBold=false){
    const chosen=isBold?bold:font;let buffer='';
    function draw(){if(y<55)next();page.drawText(buffer,{x:36,y,size:10,font:chosen,color:rgb(.06,.23,.29)});y-=15;buffer='';}
    for(let word of pdfText(value).split(/\s+/)){while(chosen.widthOfTextAtSize(word,10)>520){if(buffer)draw();const cut=Math.max(1,Math.floor(word.length*520/chosen.widthOfTextAtSize(word,10))-1);buffer=word.slice(0,cut);draw();word=word.slice(cut);}const candidate=buffer?`${buffer} ${word}`:word;if(buffer&&chosen.widthOfTextAtSize(candidate,10)>520)draw();buffer=buffer?`${buffer} ${word}`:word;}
    draw();
  }
  line('Cardiofitness | Pendências',true);line(`Ciclo: ${cycleName}`);line(`${records.length} registros no recorte. Configuração pendente não confirma falta de resposta.`);y-=12;
  for(const row of records){line(row.respondent,true);line(`${row.form} | ${row.department} | ${row.status}`);line(`Esperadas: ${row.expected??'—'} | Concluídas: ${row.completed??'—'} | Faltantes: ${row.pending??'—'}`);line(`Faltam avaliar: ${row.subjects.replace(/\n/g,', ')||(row.expected===null?'A conferir':'Nenhuma pessoa')}`);y-=12;}
  pdf.getPages().forEach((p,index)=>p.drawText(`Acesso exclusivo do RH | ${index+1}/${pdf.getPageCount()}`,{x:36,y:25,size:8,font}));saveFile(await pdf.save(),'application/pdf','Cardiofitness_Pendencias.pdf');
}
