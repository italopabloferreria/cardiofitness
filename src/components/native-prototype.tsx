'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BarChart3, CalendarDays, CheckCircle2, ClipboardCheck, ClipboardList, Download, HeartPulse, LayoutDashboard, RotateCcw, Send, ShieldCheck, UsersRound } from 'lucide-react';
import { NATIVE_TEMPLATES, nativeQuestions } from '@/lib/native/templates';
import { runNativeCycles } from '@/lib/native/engine';
import { assignmentKey, savePreviewSubmission, usePreview } from '@/lib/native/preview-store';
import type { NativeEvaluationKind } from '@/lib/native/campaign';
import styles from './native-prototype.module.css';

const kinds:NativeEvaluationKind[]=['leadership','leader_to_employee','team','self'];
const day=(s:string)=>new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(s+'T12:00:00Z'));
const mean=(scores:Record<string,number>)=>Object.values(scores).reduce((a,b)=>a+b,0)/Object.values(scores).length;
function Brand(){return <div className={styles.brand}><span className={styles.brandIcon}><HeartPulse size={22}/></span><span>Cardiofitness <small>Gestão de Pessoas</small></span></div>;}
function Notice(){return <div className={styles.prototypeNotice}><ShieldCheck size={18}/><span><b>Ambiente de demonstração.</b> Pessoas fictícias e respostas salvas apenas neste navegador. Nenhum dado real do RH ou Supabase é consultado. A seleção de nome abaixo simula uma sessão; não é autenticação.</span></div>;}
function Progress({value}:{value:number}){return <div className={styles.progressBar} role="progressbar" aria-label="Perguntas respondidas" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{width:value+'%'}}/></div>;}
function Metric({label,value,detail}:{label:string;value:string;detail:string}){return <div className={styles.metric}><span>{label}</span><b>{value}</b><small>{detail}</small></div>;}

export function NativeEvaluationPreview({ firstCampaign = false }: { firstCampaign?: boolean } = {}){
  const {state,ready,error,update}=usePreview();
  const [respondent,setRespondent]=useState('ana');
  const [selected,setSelected]=useState('');
  const [scores,setScores]=useState<Record<string,number>>({});
  const [success,setSuccess]=useState(false);
  const person=state.people.find(p=>p.id===respondent)!;
  const available=state.campaigns.filter(c=>c.status==='open'&&(!firstCampaign||c.kind==='leadership'&&c.startDate==='2026-11-01')).flatMap(c=>c.assignments.filter(a=>a.respondentId===respondent).map(a=>({campaign:c,...a,id:assignmentKey(c.id,a.respondentId,a.subjectId)})));
  const pending=available.filter(a=>!state.submissions.some(s=>s.id===a.id));
  const assignment=pending.find(a=>a.id===selected);
  const subject=state.people.find(p=>p.id===assignment?.subjectId);
  const questions=assignment?assignment.campaign.questionsBySubject[assignment.subjectId]??[]:[];
  const complete=questions.length>0&&questions.every(q=>scores[q.id]>=1&&scores[q.id]<=4);
  function select(id:string){setSelected(id);setScores({});setSuccess(false);}
  function submit(){if(!assignment||!complete)return;if(update(current=>savePreviewSubmission(current,assignment.campaign.id,respondent,assignment.subjectId,scores))){setSuccess(true);setSelected('');setScores({});}}
  return <div className={styles.portal}>
    <aside className={styles.portalAside}><Brand/><div className={styles.asideCenter}><div className={styles.asideEyebrow}>ESCUTAR. DESENVOLVER. EVOLUIR.</div><h1>Seu olhar faz a diferença.</h1><p>Uma experiência para avaliar a liderança, os colegas, a equipe e o próprio desenvolvimento.</p><div className={styles.asidePill}><ClipboardCheck size={18}/> Quatro formulários, um só lugar</div></div><span className={styles.asideFooter}>Cardiofitness • Desenvolvimento de pessoas</span></aside>
    <main className={styles.portalMain}>
      <div className={styles.topLinks}><Link className={styles.textLink} href="/preview/rh"><ArrowLeft size={16}/> Painel do RH</Link><span className={styles.previewChip}>Prévia funcional</span></div><Notice/>{firstCampaign&&<section className={styles.formBox}><h2>Avaliação de Líderes · Novembro de 2026</h2><p>Cada colaborador avalia sua própria liderança. Prazo da campanha: 30/11/2026.</p></section>}
      {error&&<p role="alert" className={styles.inlineNotice}>{error}</p>}
      <section className={styles.questionShell}>
        <div className={styles.eyebrow}>PORTAL DO COLABORADOR</div><h2>Olá, {person.name.split(' ')[0]}.</h2>
        <p className={styles.subtle}>Data simulada: {day(state.date)}. Selecione uma pessoa fictícia para experimentar suas avaliações permitidas.</p>
        <label className={styles.fieldLabel} htmlFor="preview-person">Simular sessão de</label>
        <select id="preview-person" className={styles.input} value={respondent} disabled={!ready} onChange={e=>{setRespondent(e.target.value);select('');}}>{state.people.filter(p=>p.active&&(!firstCampaign||!p.isLeader)).map(p=><option key={p.id} value={p.id}>{p.name} — {p.department}{p.isLeader?' (liderança)':''}</option>)}</select>
        {success&&<div className={styles.inlineNotice} role="status"><CheckCircle2 size={20}/> Avaliação salva na demonstração deste navegador. O painel do RH já pode exibir o resultado.</div>}
        <div className={styles.formBox}><label htmlFor="preview-assignment" className={styles.fieldLabel}>Quem você vai avaliar?</label>
          <select id="preview-assignment" className={styles.input} value={selected} disabled={!ready||!pending.length} onChange={e=>select(e.target.value)}><option value="">{pending.length?'Selecione pelo nome e tipo de avaliação':'Nenhuma avaliação pendente'}</option>{(firstCampaign?kinds.slice(0,1):kinds).map(kind=><optgroup label={NATIVE_TEMPLATES[kind].title} key={kind}>{pending.filter(a=>a.campaign.kind===kind).map(a=><option key={a.id} value={a.id}>{state.people.find(p=>p.id===a.subjectId)?.name} — {day(a.campaign.startDate)}</option>)}</optgroup>)}</select>
          <p className={styles.fieldHelp}>{available.length-pending.length} de {available.length} avaliações concluídas neste período. Apenas pessoas elegíveis aparecem na lista.</p>
        </div>
        {assignment&&<>
          <div className={styles.cycleDetails}><span><CalendarDays size={16}/>{day(assignment.campaign.startDate)} a {day(assignment.campaign.endDate)}</span><span>{questions.length} perguntas • Escala 1–4</span></div>
          <h2>{NATIVE_TEMPLATES[assignment.campaign.kind].title}</h2><p className={styles.subtle}>Pessoa avaliada: <b>{subject?.name}</b> • {subject?.department}. Responda considerando o desempenho no período.</p>
          <Progress value={Math.round(Object.keys(scores).length/questions.length*100)}/>
          <div className={styles.questions}>{questions.map((q,i)=><fieldset className={styles.questionCard} key={q.id}><legend><span className={styles.questionNumber}>{String(i+1).padStart(2,'0')}</span>{q.title}</legend><div className={styles.ratingOptions}>{[1,2,3,4].map(n=><label className={scores[q.id]===n?styles.selectedRating:styles.rating} key={n}><input type="radio" name={q.id} value={n} checked={scores[q.id]===n} onChange={()=>setScores(prev=>({...prev,[q.id]:n}))}/><b>{n}</b><small>{['Precisa melhorar','Em desenvolvimento','Atende','Supera'][n-1]}</small></label>)}</div></fieldset>)}</div>
          <div className={styles.formActions}><button className={styles.secondaryButton} onClick={()=>select('')}>Cancelar preenchimento</button><button className={styles.primaryButton} disabled={!complete||!ready} onClick={submit}><Send size={17}/> Salvar na demonstração</button></div>
        </>}
        {!assignment&&pending.length>0&&<p className={styles.subtle}>Escolha uma avaliação acima para começar. </p>}
        {!pending.length&&<div className={styles.emptyReports}><CheckCircle2 size={36}/><b>Você está em dia nesta demonstração.</b><span>Novas avaliações aparecem quando um novo ciclo é aberto.</span></div>}
      </section>
      <footer className={styles.portalFooter}><ShieldCheck size={16}/> Demonstração local • Nenhum envio para produção</footer>
    </main>
  </div>;
}

type View='overview'|'cycles'|'people'|'forms'|'reports';
export function NativeRhPreview(){
  const {state,ready,error,update,reset}=usePreview();
  const [view,setView]=useState<View>('overview');
  const [campaignId,setCampaignId]=useState('all');
  const [department,setDepartment]=useState('all');
  const [search,setSearch]=useState('');
  const [date,setDate]=useState('2026-11-15');
  const [notice,setNotice]=useState('');
  const [resetConfirm,setResetConfirm]=useState(false);
  const nav=[{id:'overview' as const,label:'Visão geral',icon:LayoutDashboard},{id:'cycles' as const,label:'Ciclos automáticos',icon:CalendarDays},{id:'people' as const,label:'Pessoas e equipes',icon:UsersRound},{id:'forms' as const,label:'Quatro formulários',icon:ClipboardList},{id:'reports' as const,label:'Resultados e pendências',icon:BarChart3}];
  const title=nav.find(n=>n.id===view)!.label;
  const personName=(id:string)=>state.people.find(p=>p.id===id)?.name??id;
  const campaigns=state.campaigns.filter(c=>campaignId==='all'||c.id===campaignId);
  const assignments=campaigns.flatMap(c=>c.assignments.map(a=>({...a,campaign:c,id:assignmentKey(c.id,a.respondentId,a.subjectId)}))).filter(a=>department==='all'||state.people.find(p=>p.id===a.subjectId)?.department===department);
  const submissions=state.submissions.filter(s=>assignments.some(a=>a.id===s.id));
  const pending=assignments.filter(a=>!submissions.some(s=>s.id===a.id));
  const totalScores=submissions.flatMap(s=>Object.values(s.scores));
  const average=totalScores.length?(totalScores.reduce((a,b)=>a+b,0)/totalScores.length).toFixed(2):'—';
  const rate=assignments.length?Math.round(submissions.length/assignments.length*100):0;
  const departments=[...new Set(state.people.map(p=>p.department))];
  function run(){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;if(update(s=>({...s,date,campaigns:runNativeCycles(s.campaigns,s.schedules,s.people,date)})))setNotice('Calendário processado. Ciclos existentes e respostas foram preservados.');}
  function download(){const esc=(v:string)=>'"'+v.replace(/"/g,'""')+'"';const rows=[['Ciclo','Modalidade','Respondente','Avaliado','Setor','Status','Média','Data de envio'],...assignments.map(a=>{const s=submissions.find(x=>x.id===a.id);return [a.campaign.startDate,NATIVE_TEMPLATES[a.kind].title,personName(a.respondentId),personName(a.subjectId),state.people.find(p=>p.id===a.subjectId)?.department??'',s?'Concluída':'Pendente',s?mean(s.scores).toFixed(2):'',s?.submittedAt??''];})];const blob=new Blob(['\ufeff'+rows.map(r=>r.map(esc).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='cardiofitness-demonstracao.csv';a.click();URL.revokeObjectURL(url);}
  return <div className={styles.rhLayout}>
    <aside className={styles.rhSidebar}><Brand/><div className={styles.navEyebrow}>ESPAÇO DO RH</div><nav aria-label="Áreas do painel">{nav.map(({id,label,icon:Icon})=><button key={id} className={view===id?styles.activeNav:styles.navButton} aria-current={view===id?'page':undefined} onClick={()=>setView(id)}><Icon size={18}/>{label}</button>)}</nav><div className={styles.navBottom}><ShieldCheck size={18}/> Prévia isolada dos dados reais</div></aside>
    <div className={styles.rhWorkspace}><header className={styles.rhTopbar}><span>Cardiofitness / <b>{title}</b></span><Link className={styles.topPreviewLink} href="/preview/avaliar">Portal do colaborador <ArrowRight size={16}/></Link></header>
    <main className={styles.rhMain}><Notice/><div className={styles.rhHeading}><div><div className={styles.eyebrow}>PESSOAS NO CENTRO</div><h1>{title}</h1><p>Acompanhe avaliações, participação e desenvolvimento em um só lugar.</p></div><button className={styles.secondaryButton} onClick={download} disabled={!ready}><Download size={17}/> Exportar seleção</button></div>
      {(error||notice)&&<div role={error?'alert':'status'} className={styles.inlineNotice}>{error||notice}</div>}
      {(view==='overview'||view==='reports')&&<>
        <section className={styles.panel}><div className={styles.rhColumns}><label className={styles.fieldLabel}>Ciclo<select className={styles.input} value={campaignId} onChange={e=>setCampaignId(e.target.value)}><option value="all">Todos os ciclos</option>{state.campaigns.map(c=><option key={c.id} value={c.id}>{NATIVE_TEMPLATES[c.kind].title} • {day(c.startDate)}</option>)}</select></label><label className={styles.fieldLabel}>Setor<select className={styles.input} value={department} onChange={e=>setDepartment(e.target.value)}><option value="all">Todos os setores</option>{departments.map(d=><option key={d}>{d}</option>)}</select></label></div></section>
        <div className={styles.metrics}><Metric label="Avaliações previstas" value={String(assignments.length)} detail="Atribuições da seleção"/><Metric label="Respostas recebidas" value={String(submissions.length)} detail={`${rate}% de participação`}/><Metric label="Pendências" value={String(pending.length)} detail="Ainda não respondidas"/><Metric label="Média das notas" value={average} detail="Escala de 1 a 4"/></div>
      </>}
      {view==='overview'&&<><div className={styles.highlightCard}><div className={styles.highlightContent}><span className={styles.highlightKicker}>ACOMPANHAMENTO EM TEMPO REAL NESTE NAVEGADOR</span><h2>O desenvolvimento começa com uma boa conversa.</h2><p>Experimente responder pelo portal e volte para acompanhar os resultados. Os filtros consideram o período e o setor selecionados.</p><Link className={styles.secondaryButton} href="/preview/avaliar">Responder uma avaliação <ArrowRight size={16}/></Link></div><ClipboardCheck size={70}/></div><div className={styles.rhColumns}><section className={styles.panel}><div className={styles.panelHeader}><h2>Participação por modalidade</h2><BarChart3 size={20}/></div>{kinds.map(kind=>{const all=assignments.filter(a=>a.kind===kind);const done=all.filter(a=>submissions.some(s=>s.id===a.id));return <div className={styles.scheduleRow} key={kind}><div><b>{NATIVE_TEMPLATES[kind].title}</b><small>{done.length} de {all.length} respostas</small></div><span>{all.length?Math.round(done.length/all.length*100):0}%</span></div>;})}</section><section className={styles.panel}><div className={styles.panelHeader}><h2>Participação por equipe</h2><UsersRound size={20}/></div>{departments.map(d=>{const all=assignments.filter(a=>state.people.find(p=>p.id===a.subjectId)?.department===d);const done=all.filter(a=>submissions.some(s=>s.id===a.id));return <div className={styles.scheduleRow} key={d}><div><b>{d}</b><small>{done.length} respostas / {all.length} previstas</small></div><span>{all.length?Math.round(done.length/all.length*100):0}%</span></div>;})}</section></div></>}
      {view==='cycles'&&<>
        <section className={styles.panel}><div className={styles.panelHeader}><h2>Calendário da demonstração</h2><CalendarDays size={20}/></div><p>Avance a data para testar abertura e encerramento automáticos. Repetir a mesma data não duplica ciclos. A frequência abaixo se aplica às próximas aberturas.</p><div className={styles.rhColumns}><label className={styles.fieldLabel}>Data simulada<input className={styles.input} type="date" min={state.date} max="2100-12-31" value={date} onChange={e=>setDate(e.target.value)}/></label><button className={styles.primaryButton} disabled={!ready||date<state.date||!date} onClick={run}>Processar calendário</button></div><p>Último processamento: {day(state.date)}. Esta prévia não executa tarefas em segundo plano.</p>{state.schedules.map(schedule=><div className={styles.scheduleRow} key={schedule.kind}><div><b>{NATIVE_TEMPLATES[schedule.kind].title}</b><small>Âncora: {schedule.anchorMonth} • {schedule.enabled?'Ativa':'Pausada'}</small></div><select aria-label={`Frequência de ${NATIVE_TEMPLATES[schedule.kind].title}`} value={schedule.cadenceMonths} onChange={e=>update(s=>({...s,schedules:s.schedules.map(x=>x.kind===schedule.kind?{...x,cadenceMonths:Number(e.target.value) as 1|2}:x)}))}><option value={1}>Mensal</option><option value={2}>Bimestral</option></select><button className={styles.secondaryButton} onClick={()=>update(s=>({...s,schedules:s.schedules.map(x=>x.kind===schedule.kind?{...x,enabled:!x.enabled}:x)}))}>{schedule.enabled?'Pausar próximas aberturas':'Retomar'}</button></div>)}</section>
        <section className={styles.panel}><div className={styles.panelHeader}><h2>Histórico de ciclos</h2></div><div className={styles.tableWrap}><table><thead><tr><th>Modalidade</th><th>Período</th><th>Estado</th><th>Atribuições</th><th>Respostas</th></tr></thead><tbody>{state.campaigns.map(c=><tr key={c.id}><td>{NATIVE_TEMPLATES[c.kind].title}</td><td>{day(c.startDate)} — {day(c.endDate)}</td><td>{c.status==='open'?'Aberto':'Encerrado'}</td><td>{c.assignments.length}</td><td>{state.submissions.filter(s=>s.campaignId===c.id).length}</td></tr>)}</tbody></table></div></section>
      </>}
      {view==='people'&&<section className={styles.panel}><div className={styles.panelHeader}><h2>Pessoas e vínculos</h2><UsersRound size={20}/></div><label className={styles.fieldLabel}>Buscar pelo nome<input className={styles.input} placeholder="Digite um nome..." value={search} onChange={e=>setSearch(e.target.value)}/></label><p>Alterações de status afetam somente os próximos ciclos. O histórico e as atribuições já abertas permanecem preservados.</p><div className={styles.tableWrap}><table><thead><tr><th>Nome fictício</th><th>Setor</th><th>Liderança</th><th>Situação</th><th>Ação</th></tr></thead><tbody>{state.people.filter(p=>p.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))).map(p=><tr key={p.id}><td>{p.name}{p.isLeader?' • Líder':''}</td><td>{p.department}</td><td>{p.leaderId?personName(p.leaderId):'—'}</td><td>{p.active?'Ativo':'Inativo'}</td><td><button className={styles.secondaryButton} onClick={()=>update(s=>({...s,people:s.people.map(x=>x.id===p.id?{...x,active:!x.active}:x)}))}>{p.active?'Inativar':'Reativar'}</button></td></tr>)}</tbody></table></div></section>}
      {view==='forms'&&<section className={styles.panel}><div className={styles.panelHeader}><h2>Quatro modelos nativos</h2><ClipboardList size={20}/></div><p>Modelos versionados e escala de 1 a 4. As perguntas de demonstração permitem testar o fluxo; a homologação do RH antecede a coleta real.</p>{kinds.map(kind=><details className={styles.panel} key={kind}><summary><b>{NATIVE_TEMPLATES[kind].title}</b> • Versão {NATIVE_TEMPLATES[kind].version}</summary><ol>{nativeQuestions(kind).map(q=><li key={q.id}>{q.title}</li>)}</ol><Link className={styles.textLink} href="/preview/avaliar">Experimentar no portal <ArrowRight size={16}/></Link></details>)}</section>}
      {view==='reports'&&<>
        <section className={styles.panel}><div className={styles.panelHeader}><h2>Resultados individuais</h2><BarChart3 size={20}/></div>{!submissions.length?<div className={styles.emptyReports}><BarChart3 size={38}/><b>Nenhuma resposta nesta seleção.</b><span>Preencha uma avaliação no portal para gerar resultados.</span></div>:<div className={styles.tableWrap}><table><thead><tr><th>Avaliado</th><th>Respondente</th><th>Modalidade</th><th>Média</th><th>Notas</th></tr></thead><tbody>{submissions.map(s=>{const c=state.campaigns.find(c=>c.id===s.campaignId)!;return <tr key={s.id}><td>{personName(s.subjectId)}</td><td>{personName(s.respondentId)}</td><td>{NATIVE_TEMPLATES[c.kind].title}</td><td>{mean(s.scores).toFixed(2)}</td><td><details><summary>Ver respostas</summary>{(c.questionsBySubject[s.subjectId]??[]).map(q=><p key={q.id}>{q.title}: <b>{s.scores[q.id]}</b></p>)}</details></td></tr>;})}</tbody></table></div>}</section>
        <section className={styles.panel}><div className={styles.panelHeader}><h2>Pendências ({pending.length})</h2></div><div className={styles.tableWrap}><table><thead><tr><th>Respondente</th><th>Pessoa avaliada</th><th>Modalidade</th><th>Prazo</th></tr></thead><tbody>{pending.map(a=><tr key={a.id}><td>{personName(a.respondentId)}</td><td>{personName(a.subjectId)}</td><td>{NATIVE_TEMPLATES[a.kind].title}</td><td>{day(a.campaign.endDate)}</td></tr>)}</tbody></table></div></section>
      </>}
      <footer className={styles.rhFooter}><span>Prévia local • Dados históricos de produção preservados</span><button className={styles.secondaryButton} onClick={()=>setResetConfirm(true)}><RotateCcw size={14}/> Reiniciar demonstração</button>{resetConfirm&&<span>Apagar somente os dados fictícios deste navegador? <button onClick={()=>{if(reset()){setResetConfirm(false);setCampaignId('all');setDate('2026-11-15');setNotice('Demonstração reiniciada.');}}}>Sim, reiniciar</button> <button onClick={()=>setResetConfirm(false)}>Cancelar</button></span>}</footer>
    </main></div>
  </div>;
}
