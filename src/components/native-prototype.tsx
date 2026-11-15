'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowLeft, ArrowRight, BarChart3, CalendarDays, CheckCircle2, ClipboardCheck, ClipboardList, Clock3, ExternalLink, HeartPulse, LayoutDashboard, Link2, LockKeyhole, Send, Settings2, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import styles from './native-prototype.module.css';

type Role = 'employee' | 'leader';
type View = 'overview' | 'cycles' | 'people' | 'forms' | 'reports';
const FEEDBACK = [
  'Organização e cumprimento dos prazos',
  'Comunicação clara e respeitosa',
  'Colaboração e solução de problemas',
  'Comprometimento com os valores da empresa',
];
const sampleEmployees = [
  { name: 'Ana Oliveira', department: 'Recepção', leader: 'Marina Costa' },
  { name: 'João Martins', department: 'Recepção', leader: 'Marina Costa' },
  { name: 'Beatriz Souza', department: 'Central', leader: 'Rafael Lima' },
];
const formatDay = (s: string) => new Intl.DateTimeFormat('pt-BR', { timeZone:'UTC' }).format(new Date(s + 'T12:00:00Z'));

function Brand() {
  return <div className={styles.brand}><span className={styles.brandIcon}><HeartPulse size={21}/></span><span>Cardiofitness <small>Gestão de Pessoas</small></span></div>;
}
function PrototypeNotice() {
  return <div className={styles.prototypeNotice}><Sparkles size={16}/><span>Prévia de interface com dados fictícios — nenhuma resposta é gravada e nenhum ciclo real é criado.</span></div>;
}
function Progress({value}:{value:number}) {
  return <div className={styles.progressBar} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da avaliação"><span style={{width:value+'%'}}/></div>;
}

export function NativeEvaluationPreview() {
  const [role,setRole] = useState<Role>('employee');
  const [step,setStep] = useState<'welcome'|'questions'|'success'>('welcome');
  const [subject,setSubject] = useState('Ana Oliveira');
  const [scores,setScores] = useState<Record<number,number>>({});
  const [comment,setComment] = useState('');
  const allAnswered = FEEDBACK.every((_,i)=>Boolean(scores[i]));
  function begin(nextRole:Role) { setRole(nextRole);setSubject(nextRole==='leader'?'Ana Oliveira':'Marina Costa');setScores({});setComment('');setStep('questions'); }
  return <div className={styles.portal}>
    <aside className={styles.portalAside}>
      <Brand/>
      <div className={styles.asideCenter}>
        <div className={styles.asideEyebrow}>UM LINK. TODOS OS CICLOS.</div>
        <h1>Um espaço para valorizar quem faz a diferença.</h1>
        <p>A avaliação de desempenho da Cardiofitness será simples, segura e acessível pelo celular — sem precisar criar formulários a cada mês.</p>
        <div className={styles.asidePill}><LockKeyhole size={16}/> Respostas protegidas e acesso individual</div>
      </div>
      <span className={styles.asideFooter}>Cardiofitness · RH e desenvolvimento</span>
    </aside>
    <main className={styles.portalMain}>
      <div className={styles.topLinks}><Link href="/preview/rh" className={styles.textLink}><ArrowLeft size={16}/> Voltar ao dashboard</Link><span className={styles.previewChip}>Protótipo</span></div>
      <PrototypeNotice/>
      {step==='welcome'&&<section className={styles.formShell}>
        <div className={styles.roundIcon}><ClipboardCheck size={27}/></div>
        <div className={styles.eyebrow}>AVALIAÇÃO DE DESEMPENHO</div>
        <h2>Olá! Que bom ter você aqui.</h2>
        <p className={styles.subtle}>Na versão final, basta abrir <b>/avaliar</b> e informar seu código de acesso individual. O sistema reconhecerá seu setor, sua liderança e o ciclo ativo.</p>
        <div className={styles.formBox}>
          <label className={styles.fieldLabel} htmlFor="native-access-code">Código de acesso</label>
          <input id="native-access-code" className={styles.input} placeholder="Disponível após a ativação" disabled autoComplete="off"/>
          <p className={styles.fieldHelp}>A identificação segura será implementada na próxima etapa. Nunca utilizaremos apenas o nome para autenticar.</p>
        </div>
        <div className={styles.demoOptions}>
          <span>EXPERIMENTE O FLUXO COM DADOS FICTÍCIOS</span>
          <button className={styles.primaryButton} onClick={()=>begin('employee')}><UsersRound size={17}/> Simular colaborador <ArrowRight size={17}/></button>
          <button className={styles.secondaryButton} onClick={()=>begin('leader')}><ShieldCheck size={17}/> Simular líder <ArrowRight size={17}/></button>
        </div>
      </section>}
      {step==='questions'&&<section className={styles.questionShell}>
        <div className={styles.cycleDetails}><span><CalendarDays size={15}/> Ciclo fictício · Novembro de 2026</span><span><Clock3 size={15}/> 4 perguntas</span></div>
        <div className={styles.eyebrow}>{role==='employee'?'COLABORADOR → LIDERANÇA':'LIDERANÇA → COLABORADOR'}</div>
        <h2>Como foi o desempenho neste período?</h2>
        <p className={styles.subtle}>Responda com atenção. As perguntas e as pessoas elegíveis serão definidas pelo RH.</p>
        <div className={styles.formBox}>
          <label className={styles.fieldLabel} htmlFor="native-subject">Pessoa avaliada</label>
          <select className={styles.input} id="native-subject" value={subject} onChange={e=>setSubject(e.target.value)}>
            {(role==='employee'?['Marina Costa']:sampleEmployees.filter(p=>p.leader==='Marina Costa').map(p=>p.name)).map(name=><option key={name} value={name}>{name}</option>)}
          </select>
          <p className={styles.fieldHelp}>Somente vínculos permitidos para o usuário autenticado.</p>
        </div>
        <Progress value={Math.round(Object.keys(scores).length/FEEDBACK.length*100)}/>
        <div className={styles.questions}>
          {FEEDBACK.map((question,i)=><fieldset className={styles.questionCard} key={question}>
            <legend><span className={styles.questionNumber}>0{i+1}</span> {question}</legend>
            <div className={styles.ratingOptions}>
              {[1,2,3,4].map(n=><label className={scores[i]===n?styles.selectedRating:styles.rating} key={n}>
                <input type="radio" name={'question-'+i} value={n} checked={scores[i]===n} onChange={()=>setScores(prev=>({...prev,[i]:n}))}/>
                <b>{n}</b><small>{['Precisa melhorar','Em desenvolvimento','Atende','Supera'][n-1]}</small>
              </label>)}
            </div>
          </fieldset>)}
        </div>
        <label className={styles.fieldLabel} htmlFor="native-comment">Observações (opcional)</label>
        <textarea id="native-comment" className={styles.textarea} value={comment} onChange={e=>setComment(e.target.value)} maxLength={600} placeholder="Destaque pontos fortes ou oportunidades de desenvolvimento..." rows={4}/>
        <div className={styles.formActions}>
          <button className={styles.secondaryButton} onClick={()=>setStep('welcome')}>Voltar</button>
          <button className={styles.primaryButton} disabled={!allAnswered} onClick={()=>setStep('success')}><Send size={17}/> Finalizar demonstração</button>
        </div>
      </section>}
      {step==='success'&&<section className={styles.formShell}>
        <div className={styles.successIcon}><CheckCircle2 size={34}/></div>
        <h2>É assim que a confirmação aparecerá.</h2>
        <p className={styles.subtle}>Na versão definitiva, o envio será confirmado somente depois que o servidor gravar a resposta com segurança. <b>Esta simulação não salvou dados.</b></p>
        <button className={styles.primaryButton} onClick={()=>setStep('welcome')}>Voltar ao início</button>
      </section>}
      <footer className={styles.portalFooter}><ShieldCheck size={16}/> Projeto em desenvolvimento · Dados de demonstração</footer>
    </main>
  </div>;
}

function Metric({label,value,detail}:{label:string;value:string;detail:string}) {
  return <div className={styles.metric}><span>{label}</span><b>{value}</b><small>{detail}</small></div>;
}
export function NativeRhPreview() {
  const [view,setView] = useState<View>('overview');
  const [cycleStarted,setCycleStarted] = useState(false);
  const [notice,setNotice] = useState('');
  const nav: {id:View;label:string;icon:typeof Activity}[] = [
    {id:'overview',label:'Visão geral',icon:LayoutDashboard},
    {id:'cycles',label:'Ciclos automáticos',icon:CalendarDays},
    {id:'people',label:'Pessoas e equipes',icon:UsersRound},
    {id:'forms',label:'Modelos de avaliação',icon:ClipboardList},
    {id:'reports',label:'Resultados',icon:BarChart3},
  ];
  const title = nav.find(x=>x.id===view)?.label??'Visão geral';
  const nextCycle = cycleStarted?'Dezembro de 2026 (simulação)':'Novembro de 2026 (exemplo)';
  return <div className={styles.rhLayout}>
    <aside className={styles.rhSidebar}>
      <Brand/>
      <div className={styles.navEyebrow}>ESPAÇO DO RH</div>
      <nav aria-label="Áreas do painel de demonstração">
        {nav.map(({id,label,icon:Icon})=><button key={id} className={view===id?styles.activeNav:styles.navButton} onClick={()=>{setView(id);setNotice('');}} aria-current={view===id?'page':undefined}><Icon size={18}/>{label}</button>)}
      </nav>
      <div className={styles.navBottom}><LockKeyhole size={18}/> Administração segura<br/>e acesso por permissão</div>
    </aside>
    <div className={styles.rhWorkspace}>
      <header className={styles.rhTopbar}><span>Cardiofitness / <b>{title}</b></span><Link className={styles.topPreviewLink} href="/preview/avaliar"><ExternalLink size={15}/> Ver portal do colaborador</Link></header>
      <main className={styles.rhMain}>
        <PrototypeNotice/>
        <div className={styles.rhHeading}>
          <div><div className={styles.eyebrow}>PAINEL DE GESTÃO · NOVA EXPERIÊNCIA</div><h1>{title}</h1><p>Organize ciclos, acompanhe a participação e consulte o histórico em um só lugar.</p></div>
          <button className={styles.primaryButton} onClick={()=>{setCycleStarted(true);setNotice('Ciclo simulado criado. Nenhuma informação foi salva no Supabase.');setView('cycles');}}><CalendarDays size={17}/> Simular criação de ciclo</button>
        </div>
        {notice&&<div className={styles.inlineNotice}><CheckCircle2 size={17}/>{notice}</div>}
        {(view==='overview'||view==='cycles')&&<>
          <div className={styles.highlightCard}>
            <div className={styles.highlightContent}><span className={styles.highlightKicker}>CICLO SELECIONADO · EXEMPLO</span><h2>{nextCycle}</h2><p>Os formulários e as perguntas são reutilizados automaticamente. O link nunca muda; o sistema reconhece o período e as permissões de cada pessoa.</p>
              <div className={styles.highlightTags}><span><Activity size={14}/> {cycleStarted?'Simulado':'Não iniciado'}</span><span><CalendarDays size={14}/> Frequência configurável</span></div>
            </div>
            <div className={styles.highlightIcon}><ClipboardCheck size={64}/></div>
          </div>
          <div className={styles.metrics}><Metric label="Colaboradores" value="28" detail="Dados ilustrativos"/><Metric label="Lideranças" value="5" detail="Dados ilustrativos"/><Metric label="Respostas recebidas" value="—" detail="Sem conexão com dados reais"/><Metric label="Pendências" value="—" detail="Calculadas por ciclo"/></div>
        </>}
        {(view==='overview'||view==='cycles')&&<div className={styles.rhColumns}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}><h2>Link permanente de avaliações</h2><Link2 size={18}/></div>
            <p>Um único endereço para todos os funcionários e líderes. Cada pessoa verá somente as avaliações autorizadas.</p>
            <div className={styles.linkExample}><Link2 size={17}/><code>seu-dominio/avaliar</code><span>Proposto</span></div>
            <Link href="/preview/avaliar" className={styles.secondaryButton}>Experimentar o formulário <ArrowRight size={16}/></Link>
          </section>
          <section className={styles.panel}>
            <div className={styles.panelHeader}><h2>Calendário automático</h2><CalendarDays size={18}/></div>
            <div className={styles.scheduleRow}><div><b>Colaborador → liderança</b><small>Mensal · escala 1–4</small></div><span>Mensal</span></div>
            <div className={styles.scheduleRow}><div><b>Entre colegas</b><small>Conforme calendário do RH</small></div><span>Bimestral</span></div>
            <div className={styles.scheduleRow}><div><b>Líder → colaborador</b><small>Modelo separado e configurável</small></div><span>Configurável</span></div>
          </section>
        </div>}
        {view==='people'&&<section className={styles.panel}><div className={styles.panelHeader}><h2>Equipes e lideranças</h2><UsersRound size={18}/></div><p>Admissões, desligamentos e vínculos de liderança serão mantidos no RH. A identidade dos participantes será verificada antes de liberar cada formulário.</p><div className={styles.tableWrap}><table><thead><tr><th>Colaborador fictício</th><th>Setor</th><th>Liderança</th><th>Status</th></tr></thead><tbody>{sampleEmployees.map(person=><tr key={person.name}><td>{person.name}</td><td>{person.department}</td><td>{person.leader}</td><td><span className={styles.tablePill}>Ativo</span></td></tr>)}</tbody></table></div></section>}
        {view==='forms'&&<section className={styles.panel}><div className={styles.panelHeader}><h2>Modelos reutilizáveis</h2><ClipboardList size={18}/></div><p>O RH configura as perguntas uma vez. As versões ficam congeladas por ciclo para manter a comparação histórica.</p><div className={styles.formTemplates}>{['Colaborador avalia líder','Líder avalia colaborador','Avaliação entre colegas','Autoavaliação'].map((name,i)=><div className={styles.templateRow} key={name}><ClipboardList size={19}/><div><b>{name}</b><small>{i===0?'Mensal':'Modelo disponível conforme calendário'}</small></div><span>Escala 1–4</span></div>)}</div></section>}
        {view==='reports'&&<section className={styles.panel}><div className={styles.panelHeader}><h2>Resultados e evolução</h2><BarChart3 size={18}/></div><p>Quando a coleta nativa estiver integrada, o RH poderá acompanhar indicadores por ciclo, equipe e liderança, além de exportar relatórios e comparar a evolução histórica.</p><div className={styles.emptyReports}><BarChart3 size={44}/><b>Sem resultados reais nesta prévia</b><span>Este protótipo não consulta informações de colaboradores.</span></div></section>}
        <footer className={styles.rhFooter}><Settings2 size={14}/> Protótipo funcional de interface · Sem gravação no Supabase · <Link href="/preview/avaliar">Abrir a experiência do colaborador</Link></footer>
      </main>
    </div>
  </div>;
}
