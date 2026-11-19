'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, Award, BarChart3, Bell, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Copy, Database, ExternalLink, FileSpreadsheet, LayoutDashboard, LoaderCircle, LockKeyhole, LogOut, Menu, MessageCircle, Pencil, Plus, RefreshCw, Search, Settings2, ShieldCheck, UserRoundCheck, UsersRound, X, CircleOff, Trash2, TrendingUp } from 'lucide-react';
import { useApp } from '@/lib/store';
import PasswordRecovery from './password-recovery';
import RhAccess from './rh-access';
import { CycleComparison } from './comparison';
import { EvolutionDashboard } from './evolution-dashboard';
import { FormRoster } from './form-roster';
import { downloadPending } from '@/lib/export-pending';
import { bimonthlyEnd, cycleState, defaultCycle, formatDate, formatNumber, formatPercent, getEvaluationStats, mean, questionGroups, responseAverage } from '@/lib/analytics';
import { syncHealth } from '@/lib/sync-health';
import { downloadReport } from '@/lib/export';
import { getParticipation } from '@/lib/participation';
import { nativeEvaluationMapping } from '@/lib/native/evaluation-mapping';
import { isNovember2026Cycle, november2026FormStatus, NOVEMBER_2026_END } from '@/lib/november-campaign';
import { shareableCycleForms, suggestNextCycle } from '@/lib/quick-cycle';
import { resolveFormId, resolveFormLink } from '@/lib/form-link';
import { getPermanentEvaluationUrl } from '@/lib/roster-data';
import { KIND_LABELS, PROVIDED_FORMS, type AppData, type Cycle, type CycleInput, type Employee, type EmployeeInput, type Evaluation, type EvaluationInput, type EvaluationKind, type EvaluationResponse, type FormMetadata } from '@/lib/types';

type View = 'dashboard' | 'evolution' | 'links' | 'employees' | 'employee' | 'evaluations' | 'pending' | 'result' | 'reports' | 'settings';
type Editor = { type: 'quick-cycle' } | { type: 'employee'; item?: Employee } | { type: 'deactivate'; item: Employee } | { type: 'delete-employee'; item: Employee } | { type: 'cycle'; item?: Cycle; sourceCycleId?:string } | { type: 'evaluation'; item?: Evaluation; preset?: typeof PROVIDED_FORMS[number] } | { type: 'native-evaluation' } | null;
const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'employees', label: 'Colaboradores', icon: UsersRound },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  { id: 'settings', label: 'Configurações', icon: Settings2 }
] as const;
const titles: Record<View,string> = {dashboard:'Dashboard',evolution:'Evolução e Gráficos',links:'Links de Avaliação',employees:'Colaboradores',employee:'Detalhe do colaborador',evaluations:'Avaliações',pending:'Pendências',result:'Resultado da avaliação',reports:'Relatórios',settings:'Configurações'};
const subtitles: Record<View,string> = {dashboard:'Uma visão clara das pessoas, das avaliações e de cada ciclo.',evolution:'Acompanhamento da evolução histórica de notas e comparativo de desempenho por setor.',links:'Links fixos de avaliação e quadro de equipes.',employees:'Estrutura de líderes e subordinados da Cardiofitness.',employee:'Resultados individuais e histórico ao longo dos ciclos.',evaluations:'Respostas e médias de cada avaliação do ciclo.',pending:'Veja quem ainda precisa responder às avaliações do ciclo.',result:'Notas e respostas de texto identificadas do formulário selecionado.',reports:'Selecione o recorte, confira a evolução histórica e exporte os resultados.',settings:'Organize ciclos, datas, participantes e os formulários de avaliação.'};
const initials = (name:string) => name.split(' ').filter(Boolean).slice(0,2).map(word=>word[0]).join('').toUpperCase();
const person = (data:AppData,id:string) => data.employees.find(employee=>employee.id===id);
const cycleEvaluations = (data:AppData,cycleId:string) => data.evaluations.filter(evaluation=>evaluation.cycleId===cycleId);
const cycleResponses = (data:AppData,cycleId:string) => data.responses.filter(response=>data.evaluations.some(evaluation=>evaluation.id===response.evaluationId&&evaluation.cycleId===cycleId));
const expectedTotal = (evaluations:Evaluation[]) => evaluations.length&&evaluations.every(evaluation=>evaluation.expectedResponses!==null)?evaluations.reduce((sum,evaluation)=>sum+evaluation.expectedResponses!,0):null;
const errorMessage = (error:unknown) => error instanceof Error?error.message:'Não foi possível concluir a operação.';
const quantity = (value:number,singular:string,plural=singular+'s') => `${value} ${value===1?singular:plural}`;
const employeeInput = (employee:Employee):EmployeeInput => ({name:employee.name,email:employee.email,formName:employee.formName,department:employee.department,leaderId:employee.leaderId,isLeader:employee.isLeader,active:employee.active});
const cycleInput = (cycle:Cycle):CycleInput => ({name:cycle.name,startDate:cycle.startDate,endDate:cycle.endDate,participants:cycle.participants});
const evaluationInput = (evaluation:Evaluation):EvaluationInput => ({cycleId:evaluation.cycleId,name:evaluation.name,kind:evaluation.kind,sourceType:evaluation.sourceType??(evaluation.googleFormId?'legacy':'native'),googleFormId:evaluation.googleFormId,googleFormUrl:evaluation.googleFormUrl,expectedResponses:evaluation.expectedResponses,mapping:evaluation.mapping,questionSections:evaluation.questionSections??{}});

const scoreColor = (value:number|null) => value === null ? 'var(--muted)' : value < 2.5 ? '#b42318' : '#067647';
function Score({value}:{value:number|null}) { return <span style={{color:scoreColor(value)}}>{formatNumber(value)}</span>; }
function ScoreLegend() { return <p className="score-legend"><span style={{color:scoreColor(1)}}>● Vermelho: abaixo de 2,50</span><span style={{color:scoreColor(4)}}>● Verde: a partir de 2,50</span></p>; }

function Brand({light=false}:{light?:boolean}) { return <div className={`brand ${light?'brand-light':''}`}><div className="brand-logo"><img src="/brand/cardiofitness-logo.jpeg" alt="Cardiofitness — Cardiologia e Medicina Preventiva" width={718} height={106}/></div><span className="brand-product">AVALIAÇÕES</span></div>; }
function Avatar({name,large=false}:{name:string;large?:boolean}) { return <span className={`avatar ${large?'avatar-large':''}`} aria-hidden="true">{initials(name)}</span>; }
function Pill({children,kind='green'}:{children:ReactNode;kind?:'green'|'muted'|'amber'}) { return <span className={`pill pill-${kind}`}>{children}</span>; }
function Empty({title,children,action}:{title:string;children?:ReactNode;action?:ReactNode}) { return <div className="empty"><span className="empty-icon"><ClipboardList size={27}/></span><h3>{title}</h3><p>{children}</p>{action}</div>; }
function Panel({title,subtitle,children,className='',action}:{title?:string;subtitle?:string;children:ReactNode;className?:string;action?:ReactNode}) { return <section className={`panel ${className}`}>{title&&<header className="panel-head"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{action}</header>}{children}</section>; }
function Stat({label,value,note,icon}:{label:string;value:ReactNode;note:string;icon?:ReactNode}) { return <div className="stat"><div className="stat-label">{label}</div><span className="stat-icon">{icon||<BarChart3 size={19}/>}</span><strong>{value}</strong><small>{note}</small></div>; }
function Progress({received,expected}:{received:number;expected:number|null}) { const ratio=expected?Math.min(100,received/expected*100):0;return <div className="progress" role={expected?'progressbar':undefined} aria-label="Participação" aria-valuemin={expected?0:undefined} aria-valuemax={expected?expected:undefined} aria-valuenow={expected?Math.min(received,expected):undefined}><span style={{width:`${ratio}%`}}/></div>; }
function Field({label,children,hint,className=''}:{label:string;children:ReactNode;hint?:string;className?:string}) { return <label className={`field ${className}`}><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>; }
function Notice({message,onClose,success=false}:{message:string;onClose?:()=>void;success?:boolean}) { return <div className={`notice ${success?'notice-success':'notice-error'}`} role={success?'status':'alert'}><span>{message}</span>{onClose&&<button type="button" className="icon-button" aria-label="Fechar mensagem" onClick={onClose}><X size={18}/></button>}</div>; }
function Pager({page,total,setPage,size=8}:{page:number;total:number;setPage:(page:number)=>void;size?:number}) { const pages=Math.max(1,Math.ceil(total/size));return <div className="pager"><span>{total?`${(page-1)*size+1}–${Math.min(page*size,total)} de ${quantity(total,'registro')}`:'Nenhum registro'}</span><div><button type="button" className="icon-button" aria-label="Página anterior" disabled={page<=1} onClick={()=>setPage(page-1)}><ChevronLeft size={18}/></button><span>Página {page} de {pages}</span><button type="button" className="icon-button" aria-label="Próxima página" disabled={page>=pages} onClick={()=>setPage(page+1)}><ChevronRight size={18}/></button></div></div>; }
function Modal({title,subtitle,children,onClose,wide=false}:{title:string;subtitle?:string;children:ReactNode;onClose:()=>void;wide?:boolean}) {
  const dialog=useRef<HTMLDivElement>(null),closeRef=useRef(onClose),titleId=useId();closeRef.current=onClose;
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();const handle=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();closeRef.current();}if(event.key==='Tab'){const all=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], textarea:not(:disabled), [tabindex="0"]')||[]).filter(element=>element.offsetParent!==null);const first=all[0],last=all[all.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}};document.addEventListener('keydown',handle);return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',handle);previous?.focus();};},[]);
  return <div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}><div ref={dialog} className={`modal ${wide?'modal-wide':''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}><header className="modal-head"><div><h2 id={titleId}>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button type="button" className="icon-button" aria-label="Fechar janela" onClick={onClose}><X size={22}/></button></header>{children}</div></div>;
}

function AccessScreen() {
  const app=useApp();const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState<'password'|'google'|null>(null),[error,setError]=useState(''),[showPassword,setShowPassword]=useState(false),[recovery,setRecovery]=useState(false),[recoveryCode,setRecoveryCode]=useState(''),[success,setSuccess]=useState('');
  useEffect(()=>{const location=new URL(window.location.href);if(location.searchParams.get('recovery')==='1'){const recoveryCode=location.searchParams.get('code')||'';location.searchParams.delete('code');location.searchParams.delete('recovery');window.history.replaceState(null,'',location.pathname+location.search+location.hash);if(recoveryCode){setRecoveryCode(recoveryCode);setRecovery(true);}}if(location.searchParams.has('recovery_error')){setError('Link de recuperação inválido ou expirado. Clique em Esqueci minha senha para solicitar outro.');location.searchParams.delete('recovery_error');window.history.replaceState(null,'',location.pathname+location.search+location.hash);}const code=location.searchParams.get('auth_error');const messages:Record<string,string>={cancelled:'Entrada com Google cancelada. Você pode tentar novamente ou usar sua senha.',unauthorized:'Esta conta não tem acesso ao RH. Entre com uma conta autorizada.',failed:'Não foi possível entrar com Google. Tente novamente.',configuration:'O login Google ainda precisa ser configurado.'};if(code)setError(messages[code]||messages.failed);},[]);
  async function submit(event:FormEvent){event.preventDefault();setBusy('password');setError('');try{await app.login(email,password);}catch(error){setError(errorMessage(error));}finally{setBusy(null);}}
  async function google(){setBusy('google');setError('');try{const response=await fetch('/api/auth/google',{method:'POST'});const data=await response.json();if(!response.ok)throw new Error(data.error||'Não foi possível entrar com Google.');const url=new URL(data.url);if(url.protocol!=='https:')throw new Error('Endereço de autenticação inválido.');window.location.assign(url.href);}catch(error){setError(errorMessage(error));setBusy(null);}}
  return <div className="access access-premium"><aside className="access-art"><Brand light/><div className="access-story"><span className="eyebrow">PESSOAS & DESEMPENHO</span><h1>Cuidar de pessoas.<br/><b>Evoluir juntos.</b></h1><p>Cada perspectiva conta.<br/>Cada ciclo abre espaço para evoluir.</p><div className="access-orbit" aria-hidden="true"><div className="orbit-ring"/><div className="orbit-ring inner"/><span className="orbit-core"><UsersRound size={42} strokeWidth={1.25}/></span><span className="orbit-label orbit-one"><ClipboardList size={17}/>Avaliações</span><span className="orbit-label orbit-two"><UsersRound size={17}/>Colaboradores</span><span className="orbit-label orbit-three"><BarChart3 size={17}/>Resultados</span></div></div><small>Cardiologia e Medicina Preventiva <span>Portal do RH</span></small></aside><main className="access-content"><div className="access-mobile-brand"><Brand/></div>{app.status==='loading'?<div className="access-box" role="status"><LoaderCircle className="spin" size={30}/><h2>Carregando o painel</h2></div>:app.status==='setup'?<div className="access-box"><span className="access-lock"><Database size={26}/></span><h2>Ambiente em preparação</h2><p>O acesso ao painel depende da configuração do projeto e da conta autorizada do RH.</p>{app.error&&<Notice message={app.error}/>}<small>As credenciais são configuradas fora deste painel.</small></div>:recovery?<PasswordRecovery initialEmail={email} code={recoveryCode} demo={app.mode==="demo"} onBack={message=>{setRecovery(false);setRecoveryCode("");setError("");setPassword("");setSuccess(message||"");}}/>:<form className="access-box" onSubmit={submit} aria-busy={!!busy}><span className="access-kicker"><span/> ACESSO EXCLUSIVO DO RH</span><h2>Bom ter você aqui.</h2><p>Entre para acompanhar as pessoas<br className="access-break"/> e as avaliações da Cardiofitness.</p>{success&&<Notice success message={success}/ >}{(error||app.error)&&<Notice message={error||app.error!}/>}<button type="button" className="button google-button full" onClick={google} disabled={!!busy}>{busy==='google'?<LoaderCircle size={19} className="spin"/>:<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.93a6 6 0 0 1 0-3.86V7.48H3.06a10 10 0 0 0 0 9.04l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.94 5.48l3.34 2.59A5.98 5.98 0 0 1 12 5.95Z"/></svg>}Entrar com Google</button><div className="access-divider"><span>ou entre com e-mail</span></div><Field label="E-mail"><input autoComplete="username" type="email" required disabled={!!busy} value={email} onChange={event=>setEmail(event.target.value)} placeholder="seu.email@empresa.com.br"/></Field><Field label="Senha"><span className="password-control"><input autoComplete="current-password" type={showPassword?'text':'password'} required disabled={!!busy} value={password} onChange={event=>setPassword(event.target.value)} placeholder="Digite sua senha"/><button type="button" aria-label={showPassword?'Ocultar senha':'Mostrar senha'} aria-pressed={showPassword} onClick={()=>setShowPassword(!showPassword)}>{showPassword?'Ocultar':'Mostrar'}</button></span></Field><button type="button" className="text-button recovery-secondary" disabled={!!busy} onClick={()=>{setRecovery(true);setError("");setSuccess("");}}>Esqueci minha senha</button><button className="button primary full password-submit" disabled={!!busy}>{busy==='password'?<LoaderCircle size={18} className="spin"/>:null}Entrar com e-mail e senha<ArrowRight size={18}/></button><div className="access-foot"><ShieldCheck size={17}/><span>Ambiente restrito às contas autorizadas do RH.</span></div></form>}<footer className="access-copyright">© {new Date().getFullYear()} Cardiofitness · Avaliações</footer></main></div>;
}

export default function Application() {
  const app=useApp();const [view,setView]=useState<View>('dashboard'),[cycleId,setCycleId]=useState(''),[employeeId,setEmployeeId]=useState(''),[evaluationId,setEvaluationId]=useState(''),[editor,setEditor]=useState<Editor>(null),[mobile,setMobile]=useState(false),[notice,setNotice]=useState<{text:string;success:boolean}|null>(null),[syncing,setSyncing]=useState('');
  const data=app.data;const cycles=[...data.cycles].sort((a,b)=>b.startDate.localeCompare(a.startDate));const selectedCycleId=data.cycles.some(cycle=>cycle.id===cycleId)?cycleId:defaultCycle(cycles)?.id||'';const selectedCycle=data.cycles.find(cycle=>cycle.id===selectedCycleId);const employee=person(data,employeeId);const evaluation=data.evaluations.find(evaluation=>evaluation.id===evaluationId);
  function navigate(next:View){setView(next);setMobile(false);setNotice(null);}
  function openEmployee(id:string){setEmployeeId(id);navigate('employee');}
  function openEvaluation(id:string){const target=data.evaluations.find(item=>item.id===id);if(target)setCycleId(target.cycleId);setEvaluationId(id);navigate('result');}
  async function sync(id:string){setSyncing(id);setNotice(null);try{const result=await app.syncEvaluation(id);setNotice({text:`Sincronização concluída: ${quantity(result.summary.imported,'resposta importada','respostas importadas')}, ${quantity(result.summary.duplicates,'resposta já registrada','respostas já registradas')}, ${quantity(result.summary.rejected,'resposta não importada','respostas não importadas')}.${result.summary.issues.length?' '+result.summary.issues.join(' '):''}`,success:true});}catch(error){setNotice({text:errorMessage(error),success:false});}finally{setSyncing('');}}
  if(app.status==='password')return <main className="first-password"><Brand/><PasswordSettings required/></main>;
  if(app.status!=='ready')return <AccessScreen/>;
  const activeNav=view==='employee'?'employees':view==='result'?'evaluations':view;
  return <div className="app-shell top-nav-shell">
    <a className="skip-link" href="#main">Ir para o conteúdo</a>
    <header className="main-topbar">
      <div className="topbar-container">
        <div className="topbar-left">
          <div className="topbar-brand">
            <img src="/brand/cardiofitness-logo.jpeg" alt="Cardiofitness" className="topbar-logo" />
            <span className="topbar-product-tag">GESTÃO DE PESSOAS</span>
          </div>
          <nav className="topbar-nav" aria-label="Menu principal">
            {NAV.map(item => (
              <button
                type="button"
                key={item.id}
                className={`topbar-nav-item ${activeNav === item.id ? 'active' : ''}`}
                aria-current={activeNav === item.id ? 'page' : undefined}
                onClick={() => navigate(item.id)}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="topbar-right">
          <a href="/avaliar" target="_blank" rel="noopener noreferrer" className="button small topbar-portal-btn">
            <ClipboardList size={15} /> Portal público
          </a>
          <Pill kind="green">RH Ativo</Pill>
          <div className="topbar-user">
            <Avatar name={app.user?.name || 'Recursos Humanos'} />
            <div className="topbar-user-info">
              <b>{app.user?.name || 'Recursos Humanos'}</b>
              <small>{app.user?.email || 'cadiofit@gmail.com'}</small>
            </div>
          </div>
          {app.mode === 'live' && (
            <button
              type="button"
              className="icon-button"
              title="Sair da conta"
              aria-label="Sair da conta"
              onClick={() => void app.logout().catch(error => setNotice({ text: errorMessage(error), success: false }))}
            >
              <LogOut size={17} />
            </button>
          )}
        </div>
      </div>
    </header>
    <div className="workspace-full">
      <main id="main" className="main">
        <div className="page-heading">
          <div>
            {(view === 'employee' || view === 'result') && (
              <button type="button" className="back-link" onClick={() => navigate(view === 'employee' ? 'employees' : 'dashboard')}>
                <ArrowLeft size={16} /> Voltar para {view === 'employee' ? 'colaboradores' : 'dashboard'}
              </button>
            )}
            <h1>{view === 'employee' && employee ? employee.name : view === 'result' && evaluation ? evaluation.name : titles[view]}</h1>
            <p>{subtitles[view]}</p>
          </div>
          <div className="page-actions">
            {view === 'employees' ? (
              <button className="button primary" onClick={() => setEditor({ type: 'employee' })}>
                <Plus size={18} /> Adicionar colaborador
              </button>
            ) : view === 'settings' || view === 'result' ? null : (
              <Field label="Ciclo" className="cycle-select">
                <select value={selectedCycleId} onChange={event => setCycleId(event.target.value)} aria-label="Selecionar ciclo">
                  {!cycles.length && <option value="">Nenhum ciclo cadastrado</option>}
                  {cycles.map(cycle => (
                    <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>
        </div>
        {notice && <Notice message={notice.text} success={notice.success} onClose={() => setNotice(null)} />}
        {app.error && <Notice message={app.error} />}
      {view==='dashboard'&&<Dashboard data={data} cycle={selectedCycle} onQuickCycle={()=>setEditor({type:'quick-cycle'})} onConfigure={()=>navigate('settings')} onResults={openEvaluation} onOpenLinks={()=>navigate('links')} onNavigate={navigate} onEditCycle={item=>setEditor({type:'cycle',item})}/>}
      {view==='evolution'&&<EvolutionDashboard data={data} activeCycleId={selectedCycleId}/>}
      {view==='links'&&<PermanentLinksPanel data={data} cycle={selectedCycle} onOpenEmployee={openEmployee} onAddEmployee={()=>setEditor({type:'employee'})} onEditEmployee={item=>setEditor({type:'employee',item})} onDeleteEmployee={item=>setEditor({type:'delete-employee',item})}/>}
      {view==='employees'&&<Employees data={data} cycle={selectedCycle} onOpen={openEmployee} onAdd={()=>setEditor({type:'employee'})} onEdit={item=>setEditor({type:'employee',item})} onDeactivate={item=>setEditor({type:'deactivate',item})} onDelete={item=>setEditor({type:'delete-employee',item})}/>}
      {view==='employee'&&(employee?<EmployeeDetail data={data} employee={employee} cycleId={selectedCycleId} onEdit={()=>setEditor({type:'employee',item:employee})} onResults={openEvaluation}/>:<Empty title="Selecione um colaborador" action={<button className="button" onClick={()=>navigate('employees')}>Ver colaboradores</button>}/>)}
      {view==='evaluations'&&<Evaluations data={data} cycle={selectedCycle} onResults={openEvaluation} onConfigure={()=>navigate('settings')}/>}
      {view==='pending'&&<Pending data={data} cycleId={selectedCycleId} onPerson={openEmployee} onConfigure={()=>navigate('settings')}/>}
      {view==='result'&&(evaluation?<Result data={data} evaluation={evaluation} onPerson={openEmployee}/>:<Empty title="Selecione uma avaliação"/>)}
      {view==='reports'&&<Reports data={data} cycleId={selectedCycleId} onError={text=>setNotice({text,success:false})}/>}
      {view==='settings'&&<Configuration data={data} cycleId={selectedCycleId} setCycleId={setCycleId} onEdit={setEditor} demo={app.mode==='demo'} googleConfigured={app.googleConfigured}/>}
      <footer className="main-footer"><span>Cardiofitness · Avaliações de desempenho</span><span>Painel de Recursos Humanos · Respostas identificadas</span></footer></main></div>
      {editor?.type==='quick-cycle'&&<QuickCycleEditor data={data} onClose={()=>setEditor(null)} onConfigure={()=>{setEditor(null);navigate('settings');}} onCreated={id=>{setCycleId(id);setNotice({text:'Novo ciclo criado. Os links do portal já estão disponíveis para compartilhamento.',success:true});}}/>}
      {editor?.type==='employee'&&<EmployeeEditor data={data} employee={editor.item} onClose={()=>setEditor(null)} onSaved={name=>{setEditor(null);setNotice({text:`Cadastro de ${name} salvo.`,success:true});}}/>}
      {editor?.type==='deactivate'&&<Deactivate employee={editor.item} onClose={()=>setEditor(null)} onSaved={()=>{setEditor(null);setNotice({text:'Colaborador desativado. O histórico foi preservado.',success:true});}}/>}
      {editor?.type==='delete-employee'&&<DeleteEmployeeModal data={data} employee={editor.item} onClose={()=>setEditor(null)} onDeleted={()=>{setEditor(null);setNotice({text:'Colaborador excluído com sucesso.',success:true});}} onDeactivated={()=>{setEditor(null);setNotice({text:'Colaborador desativado. O histórico foi preservado.',success:true});}}/>}
      {editor?.type==='cycle'&&<CycleEditor data={data} cycle={editor.item} sourceCycleId={editor.sourceCycleId} onClose={()=>setEditor(null)} onSaved={id=>{setEditor(null);setCycleId(id);setNotice({text:'Ciclo salvo.',success:true});}}/>}
      {editor?.type==='native-evaluation'&&<NativeEvaluationEditor data={data} cycleId={selectedCycleId} onClose={()=>setEditor(null)} onSaved={()=>{setEditor(null);setNotice({text:'Avaliação nativa criada e pronta para compartilhar.',success:true});}}/>}
      {editor?.type==='evaluation'&&<EvaluationEditor data={data} cycleId={selectedCycleId} evaluation={editor.item} preset={editor.preset} onClose={()=>setEditor(null)} onSaved={()=>{setEditor(null);setNotice({text:'Configuração do formulário salva.',success:true});}}/>}
    </div>;
}

function LeaderRosterAccordion({
  data,
  cycle,
  onOpenEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onAddEmployee,
  title = 'Quadro de Colaboradores por Liderança',
  subtitle = 'Clique em uma liderança para abrir seus subordinados. Organizado por equipes, sem necessidade de páginas.',
  showStats = true,
}: {
  data: AppData;
  cycle?: Cycle;
  onOpenEmployee: (id: string) => void;
  onEditEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employee: Employee) => void;
  onAddEmployee?: () => void;
  title?: string;
  subtitle?: string;
  showStats?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const allEmployees = data.employees;
  const activeEmployees = allEmployees.filter(e => e.active);
  const departments = [...new Set(allEmployees.map(e => e.department))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const q = query.trim().toLocaleLowerCase('pt-BR');

  function matchEmp(emp: Employee) {
    const matchStatus = status === 'all' ? true : status === 'active' ? emp.active : !emp.active;
    const matchDept = !department || emp.department === department;
    const matchQ = !q || `${emp.name} ${emp.department} ${emp.email} ${emp.formName}`.toLocaleLowerCase('pt-BR').includes(q);
    return matchStatus && matchDept && matchQ;
  }

  // Leaders
  const leaders = allEmployees.filter(e => e.isLeader);

  // Group leaders with their subordinates
  const leaderGroups = leaders.map(leader => {
    const directSubs = allEmployees.filter(e => e.leaderId === leader.id && (e.id !== leader.id || e.leaderId === e.id));
    const visibleSubs = directSubs.filter(matchEmp);
    const leaderSelfMatches = matchEmp(leader);
    const visible = leaderSelfMatches || visibleSubs.length > 0;
    return {
      leader,
      subordinates: directSubs,
      visibleSubordinates: visibleSubs,
      visible,
      hasMatchInSubs: q ? visibleSubs.length > 0 : false,
    };
  }).filter(group => group.visible);

  // Unassigned employees (not a leader and no valid leader)
  const unassigned = allEmployees.filter(e =>
    !e.isLeader && (!e.leaderId || !leaders.some(l => l.id === e.leaderId))
  ).filter(matchEmp);

  const toggleLeader = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    leaderGroups.forEach(g => { next[g.leader.id] = true; });
    next['unassigned'] = true;
    setExpanded(next);
  };

  const collapseAll = () => {
    setExpanded({});
  };

  const totalVisibleCount = leaderGroups.reduce((acc, g) => acc + (matchEmp(g.leader) ? 1 : 0) + g.visibleSubordinates.length, 0) + unassigned.length;

  return (
    <>
      {showStats && (
        <div className="stat-grid four">
          <Stat label="Total Cadastrado" value={allEmployees.length} note="Todos os registros" icon={<UsersRound size={19}/>}/>
          <Stat label="Colaboradores Ativos" value={activeEmployees.length} note="Conforme quadro oficial" icon={<Check size={19}/>}/>
          <Stat label="Lideranças Ativas" value={activeEmployees.filter(e=>e.isLeader).length} note="Setores da clínica" icon={<UserRoundCheck size={19}/>}/>
          <Stat label="Ciclo Atual" value={cycle?.name || 'Nenhum'} note={cycle ? `${formatDate(cycle.startDate)} a ${formatDate(cycle.endDate)}` : 'Sem ciclo'} icon={<CalendarDays size={19}/>}/>
        </div>
      )}

      <Panel
        title={title}
        subtitle={subtitle}
        action={
          onAddEmployee && (
            <button type="button" className="button primary" onClick={onAddEmployee}>
              <Plus size={16}/>Adicionar colaborador
            </button>
          )
        }
      >
        <div className="table-filters" style={{ flexWrap: 'wrap', gap: 10 }}>
          <label className="search-field" style={{ minWidth: 220, flex: 2 }}>
            <Search size={18}/>
            <span className="sr-only">Buscar colaborador</span>
            <input
              placeholder="Buscar por nome, setor ou líder..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </label>

          <select
            aria-label="Filtrar por setor"
            value={department}
            onChange={e => setDepartment(e.target.value)}
            style={{ flex: 1, minWidth: 150 }}
          >
            <option value="">Todos os setores</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            aria-label="Filtrar por status"
            value={status}
            onChange={e => setStatus(e.target.value as any)}
            style={{ flex: 1, minWidth: 130 }}
          >
            <option value="active">Apenas Ativos</option>
            <option value="all">Todos os status</option>
            <option value="inactive">Apenas Inativos</option>
          </select>

          <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <button
              type="button"
              className="button small"
              onClick={expandAll}
              title="Expandir todas as equipes de líderes"
            >
              Expandir todos
            </button>
            <button
              type="button"
              className="button small"
              onClick={collapseAll}
              title="Recolher todas as equipes"
            >
              Recolher todos
            </button>
          </div>

          <span className="record-count">{quantity(totalVisibleCount, 'pessoa')}</span>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          {leaderGroups.length === 0 && unassigned.length === 0 ? (
            <Empty title="Nenhum colaborador encontrado com os filtros selecionados.">
              Ajuste a busca ou altere os filtros de status e setor.
            </Empty>
          ) : (
            leaderGroups.map(({ leader, subordinates, visibleSubordinates, hasMatchInSubs }) => {
              const isOpen = expanded[leader.id] ?? (q ? hasMatchInSubs : false);

              return (
                <div
                  key={leader.id}
                  style={{
                    border: isOpen ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                    borderRadius: 10,
                    marginBottom: 14,
                    overflow: 'hidden',
                    background: '#ffffff',
                    boxShadow: isOpen ? '0 2px 8px rgba(37,99,235,0.06)' : '0 1px 3px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Leader Header Row (Click to toggle) */}
                  <div
                    onClick={() => toggleLeader(leader.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      background: isOpen ? '#f0f7ff' : '#ffffff',
                      cursor: 'pointer',
                      userSelect: 'none',
                      borderBottom: isOpen ? '1px solid #e0f2fe' : 'none',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span
                        style={{
                          color: isOpen ? '#1d4ed8' : 'var(--muted)',
                          display: 'inline-flex',
                          transition: 'transform 0.2s',
                          transform: isOpen ? 'rotate(90deg)' : 'none',
                        }}
                      >
                        <ChevronRight size={18} />
                      </span>
                      <Avatar name={leader.name} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <b style={{ fontSize: 14, color: 'var(--ink)' }}>{leader.name}</b>
                          <Pill kind="green">Líder de Setor</Pill>
                          <Pill kind={leader.active ? 'green' : 'muted'}>{leader.active ? 'Ativo' : 'Inativo'}</Pill>
                        </div>
                        <small style={{ color: 'var(--muted)', display: 'block', marginTop: 2 }}>
                          {leader.department} · {leader.email || 'Cardiofitness'}
                        </small>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: 20,
                          background: subordinates.length ? '#e0f2fe' : '#f1f5f9',
                          color: subordinates.length ? '#0369a1' : '#64748b',
                        }}
                      >
                        {quantity(subordinates.length, 'subordinado')}
                      </span>

                      <div style={{ display: 'inline-flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          className="button small"
                          title="Ver histórico e notas do líder"
                          onClick={() => onOpenEmployee(leader.id)}
                        >
                          <ArrowRight size={14} /> Detalhe
                        </button>
                        <button
                          type="button"
                          className="button small"
                          title="Editar cadastro do líder"
                          onClick={() => onEditEmployee(leader)}
                        >
                          <Pencil size={14} /> Editar
                        </button>
                        <button
                          type="button"
                          className="button small danger-outline"
                          title="Remover liderança"
                          style={{ color: '#b42318' }}
                          onClick={() => onDeleteEmployee(leader)}
                        >
                          <Trash2 size={14} /> Remover
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Subordinates Accordion Body */}
                  {isOpen && (
                    <div style={{ background: '#fafbfc' }}>
                      {visibleSubordinates.length === 0 ? (
                        <p style={{ margin: 0, padding: '16px 22px', fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
                          {q ? 'Nenhum subordinado corresponde ao filtro de busca.' : 'Nenhum colaborador subordinado vinculado a esta liderança.'}
                        </p>
                      ) : (
                        <div className="table-scroll">
                          <table style={{ background: '#ffffff' }}>
                            <thead>
                              <tr style={{ background: '#f8fafc' }}>
                                <th style={{ paddingLeft: 22 }}>Colaborador</th>
                                <th>Setor</th>
                                <th>Papel</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right', paddingRight: 22 }}>Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {visibleSubordinates.map(sub => {
                                const isIntern = sub.formName.toLowerCase().includes('estagi');
                                return (
                                  <tr key={sub.id}>
                                    <td style={{ paddingLeft: 22 }}>
                                      <div className="person-button" style={{ cursor: 'pointer' }} onClick={() => onOpenEmployee(sub.id)}>
                                        <Avatar name={sub.name} />
                                        <span>
                                          <b style={{ color: 'var(--ink)' }}>{sub.name}</b>
                                          <small>{sub.email || 'Cardiofitness'}</small>
                                        </span>
                                      </div>
                                    </td>
                                    <td>{sub.department}</td>
                                    <td>
                                      <Pill kind={sub.isLeader ? 'green' : isIntern ? 'amber' : 'muted'}>
                                        {sub.isLeader ? 'Líder / Colaborador' : isIntern ? 'Estagiário' : 'Colaborador'}
                                      </Pill>
                                    </td>
                                    <td>
                                      <Pill kind={sub.active ? 'green' : 'muted'}>
                                        {sub.active ? 'Ativo' : 'Inativo'}
                                      </Pill>
                                    </td>
                                    <td style={{ textAlign: 'right', paddingRight: 22 }}>
                                      <div style={{ display: 'inline-flex', gap: 6 }}>
                                        <button
                                          type="button"
                                          className="button small"
                                          title="Ver histórico e notas"
                                          onClick={() => onOpenEmployee(sub.id)}
                                        >
                                          <ArrowRight size={14} /> Detalhe
                                        </button>
                                        <button
                                          type="button"
                                          className="button small"
                                          title="Editar colaborador"
                                          onClick={() => onEditEmployee(sub)}
                                        >
                                          <Pencil size={14} /> Editar
                                        </button>
                                        <button
                                          type="button"
                                          className="button small danger-outline"
                                          title="Remover colaborador"
                                          style={{ color: '#b42318' }}
                                          onClick={() => onDeleteEmployee(sub)}
                                        >
                                          <Trash2 size={14} /> Remover
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Unassigned Collaborators (if any exist) */}
          {unassigned.length > 0 && (
            <div
              style={{
                border: expanded['unassigned'] ? '1px solid #fcd34d' : '1px solid #e2e8f0',
                borderRadius: 10,
                marginTop: 18,
                overflow: 'hidden',
                background: '#ffffff',
              }}
            >
              <div
                onClick={() => setExpanded(prev => ({ ...prev, unassigned: !prev.unassigned }))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: expanded['unassigned'] ? '#fffbeb' : '#ffffff',
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderBottom: expanded['unassigned'] ? '1px solid #fef3c7' : 'none',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      color: 'var(--muted)',
                      display: 'inline-flex',
                      transition: 'transform 0.2s',
                      transform: expanded['unassigned'] ? 'rotate(90deg)' : 'none',
                    }}
                  >
                    <ChevronRight size={18} />
                  </span>
                  <div>
                    <b style={{ fontSize: 14, color: '#92400e' }}>Outros Colaboradores (Sem Líder Vinculado)</b>
                    <small style={{ color: 'var(--muted)', display: 'block', marginTop: 2 }}>
                      Colaboradores que não possuem liderança direta atribuída
                    </small>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#fef3c7', color: '#92400e' }}>
                    {quantity(unassigned.length, 'colaborador')}
                  </span>
                </div>
              </div>

              {expanded['unassigned'] && (
                <div className="table-scroll">
                  <table style={{ background: '#ffffff' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ paddingLeft: 22 }}>Colaborador</th>
                        <th>Setor</th>
                        <th>Papel</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right', paddingRight: 22 }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unassigned.map(emp => (
                        <tr key={emp.id}>
                          <td style={{ paddingLeft: 22 }}>
                            <div className="person-button" style={{ cursor: 'pointer' }} onClick={() => onOpenEmployee(emp.id)}>
                              <Avatar name={emp.name} />
                              <span>
                                <b style={{ color: 'var(--ink)' }}>{emp.name}</b>
                                <small>{emp.email || 'Cardiofitness'}</small>
                              </span>
                            </div>
                          </td>
                          <td>{emp.department}</td>
                          <td>
                            <Pill kind="muted">Colaborador</Pill>
                          </td>
                          <td>
                            <Pill kind={emp.active ? 'green' : 'muted'}>{emp.active ? 'Ativo' : 'Inativo'}</Pill>
                          </td>
                          <td style={{ textAlign: 'right', paddingRight: 22 }}>
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <button type="button" className="button small" onClick={() => onOpenEmployee(emp.id)}>
                                <ArrowRight size={14} /> Detalhe
                              </button>
                              <button type="button" className="button small" onClick={() => onEditEmployee(emp)}>
                                <Pencil size={14} /> Editar
                              </button>
                              <button type="button" className="button small danger-outline" style={{ color: '#b42318' }} onClick={() => onDeleteEmployee(emp)}>
                                <Trash2 size={14} /> Remover
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </Panel>
    </>
  );
}

function WhatsAppModal({cycle,leadUrl,teamUrl,onClose}:{cycle?:Pick<Cycle,'name'|'endDate'>;leadUrl:string;teamUrl:string;onClose:()=>void}) {
  const [copiedIndex, setCopiedIndex] = useState<number|null>(null);

  const messages = [
    {
      title: '1. Mensagem Geral (2 Formulários + Prazo)',
      badge: 'Recomendada',
      description: 'Ideal para enviar no grupo da clínica ou aviso geral para todos os colaboradores.',
      text: `Olá, equipe Cardiofitness! 👋\n\nEstá aberto o ciclo de avaliação de desempenho *${cycle?.name || 'Cardiofitness'}*.\n\nPreencham os dois formulários nos links fixos abaixo (basta selecionar seu próprio nome na lista):\n\n1️⃣ *Avaliação de Líderes:*\n${leadUrl}\n\n2️⃣ *Avaliação e Autoavaliação da Equipe:*\n${teamUrl}\n\n⏰ Disponível até ${cycle ? formatDate(cycle.endDate) : 'o prazo do ciclo'}.\nCardiofitness — Gestão de Pessoas`,
    },
    {
      title: '2. Formulário 1 — Avaliação de Líderes',
      badge: 'Liderança',
      description: 'Mensagem focada exclusivamente no link de avaliação de líderes do setor.',
      text: `Olá! 👋\n\nEstá aberto o ciclo de avaliação *${cycle?.name || 'Cardiofitness'}*.\n\nAcesse o link abaixo para preencher a *Avaliação de Líderes* (basta selecionar seu nome na lista):\n${leadUrl}\n\nPeríodo aberto até ${cycle ? formatDate(cycle.endDate) : 'o encerramento'}.\nCardiofitness — Gestão de Pessoas`,
    },
    {
      title: '3. Formulário 2 — Avaliação e Autoavaliação da Equipe',
      badge: 'Equipe',
      description: 'Mensagem focada na autoavaliação e avaliação entre colegas de setor.',
      text: `Olá! 👋\n\nEstá aberto o ciclo de avaliação *${cycle?.name || 'Cardiofitness'}*.\n\nAcesse o link abaixo para preencher a *Avaliação e Autoavaliação da Equipe* (basta selecionar seu nome na lista):\n${teamUrl}\n\nPeríodo aberto até ${cycle ? formatDate(cycle.endDate) : 'o encerramento'}.\nCardiofitness — Gestão de Pessoas`,
    },
  ];

  async function copyMsg(text: string, index: number) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard indisponível');
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 3000);
    } catch {}
  }

  return (
    <Modal wide title="3 Mensagens Prontas para WhatsApp" subtitle="Os modelos incluem os links oficiais do portal de avaliação para este ciclo." onClose={onClose}>
      <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:16}}>
        {messages.map((m, idx) => (
          <div key={idx} style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8,gap:12,flexWrap:'wrap'}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <b style={{fontSize:14,color:'#0f172a'}}>{m.title}</b>
                  <span style={{background: idx === 0 ? '#dcfce7' : '#e0f2fe', color: idx === 0 ? '#15803d' : '#0369a1', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700}}>{m.badge}</span>
                </div>
                <p style={{fontSize:12,color:'#64748b',margin:'2px 0 0'}}>{m.description}</p>
              </div>
              <button
                type="button"
                className="button small primary"
                onClick={() => void copyMsg(m.text, idx)}
                style={{background: copiedIndex === idx ? '#059669' : '#16a34a', borderColor: copiedIndex === idx ? '#059669' : '#16a34a'}}
              >
                {copiedIndex === idx ? <Check size={14}/> : <Copy size={14}/>}
                {copiedIndex === idx ? '✓ Mensagem copiada!' : 'Copiar esta mensagem'}
              </button>
            </div>
            <pre style={{whiteSpace:'pre-wrap',fontFamily:'inherit',fontSize:12,background:'#fff',border:'1px solid #cbd5e1',borderRadius:6,padding:10,margin:0,color:'#334155',lineHeight:1.5}}>
              {m.text}
            </pre>
          </div>
        ))}
      </div>
      <div className="modal-actions">
        <button type="button" className="button" onClick={onClose}>Fechar</button>
      </div>
    </Modal>
  );
}

function PermanentLinksPanel({data, cycle, onOpenEmployee, onAddEmployee, onEditEmployee, onDeleteEmployee}:{data:AppData; cycle?:Cycle; onOpenEmployee:(id:string)=>void; onAddEmployee:()=>void; onEditEmployee:(e:Employee)=>void; onDeleteEmployee:(e:Employee)=>void}) {
  const [copiedLink, setCopiedLink] = useState('');
  const [copiedType, setCopiedType] = useState<'url'|'whatsapp'|'all'|null>(null);
  const [showWaModal, setShowWaModal] = useState(false);

  const evaluations = cycle ? cycleEvaluations(data, cycle.id) : [];
  const leadUrl = evaluations.find(evaluation => evaluation.kind === 'leadership')?.googleFormUrl || '';
  const teamUrl = evaluations.find(evaluation => evaluation.kind === 'team')?.googleFormUrl || '';

  async function handleCopy(text: string, id: string, type: 'url'|'whatsapp'|'all') {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard indisponível');
      await navigator.clipboard.writeText(text);
      setCopiedLink(id);
      setCopiedType(type);
      setTimeout(() => {
        setCopiedLink('');
        setCopiedType(null);
      }, 3000);
    } catch {
      // fallback
    }
  }

  function handleCopyAll() {
    if (!leadUrl || !teamUrl) return;
    const text = `Olá, equipe Cardiofitness! 👋\n\nEstá aberto o ciclo de avaliação de desempenho *${cycle?.name || 'Cardiofitness'}*.\n\nPreencham os dois formulários nos links fixos abaixo (basta selecionar seu próprio nome na lista):\n\n1️⃣ *Avaliação de Líderes:*\n${leadUrl}\n\n2️⃣ *Avaliação e Autoavaliação da Equipe:*\n${teamUrl}\n\n⏰ Disponível até ${cycle ? formatDate(cycle.endDate) : 'o prazo do ciclo'}.\nCardiofitness — Gestão de Pessoas`;
    void handleCopy(text, 'all', 'all');
  }

  const waLeadMsg = leadUrl ? `Olá! 👋\n\nEstá aberto o ciclo de avaliação *${cycle?.name || 'Cardiofitness'}*.\n\nAcesse o link abaixo para preencher a *Avaliação de Líderes*:\n${leadUrl}\n\nPeríodo aberto até ${cycle ? formatDate(cycle.endDate) : 'o encerramento'}.\nCardiofitness — Gestão de Pessoas` : '';
  const waTeamMsg = teamUrl ? `Olá! 👋\n\nEstá aberto o ciclo de avaliação *${cycle?.name || 'Cardiofitness'}*.\n\nAcesse o link abaixo para preencher a *Avaliação e Autoavaliação da Equipe*:\n${teamUrl}\n\nPeríodo aberto até ${cycle ? formatDate(cycle.endDate) : 'o encerramento'}.\nCardiofitness — Gestão de Pessoas` : '';

  return (
    <>
      {showWaModal && <WhatsAppModal cycle={cycle} leadUrl={leadUrl} teamUrl={teamUrl} onClose={()=>setShowWaModal(false)}/>}
      <div className="info-banner" style={{background:'#f0f7fd',borderColor:'#c5def1',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16}}>
        <div style={{maxWidth:760}}>
          <b style={{fontSize:16,color:'#0573b9',display:'flex',alignItems:'center',gap:8}}>
            <ExternalLink size={20}/> Links de Avaliação do Portal Web Cardiofitness
          </b>
          <p style={{margin:'6px 0 0',fontSize:13,lineHeight:1.6,color:'#365977'}}>
            Compartilhe os links de avaliação com a equipe. As respostas são gravadas em tempo real diretamente no Supabase. Ciclo: <b>{cycle?.name || 'Sem ciclo'}</b>.
          </p>
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <button type="button" className="button" disabled={!leadUrl || !teamUrl} onClick={()=>setShowWaModal(true)} style={{borderColor:'#86efac',color:'#166534',background:'#f0fdf4'}}>
            <MessageCircle size={16}/>Mensagens do WhatsApp (3)
          </button>
          <button type="button" className="button primary" disabled={!leadUrl || !teamUrl} onClick={handleCopyAll}>
            <Copy size={16}/>{copiedType==='all'?'Mensagem com os 2 links copiada!':'Copiar mensagem geral (WhatsApp)'}
          </button>
          <button type="button" className="button" onClick={onAddEmployee}>
            <Plus size={16}/>Adicionar colaborador
          </button>
        </div>
      </div>

      {/* Cartões dos 2 Links Fixos */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))',gap:16,margin:'20px 0'}}>
        {/* Formulário 1: Líderes */}
        <div style={{background:'#fff',border:'1px solid #bfdbfe',borderRadius:12,padding:'20px',boxShadow:'0 2px 8px rgba(0,0,0,0.03)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
            <span style={{background:'#dbeafe',color:'#1d4ed8',padding:'4px 8px',borderRadius:6,fontSize:11,fontWeight:700}}>PORTAL NATIVO</span>
            <b style={{fontSize:16,color:'#1e3a8a'}}>Avaliação de Líderes</b>
          </div>
          <p style={{fontSize:13,color:'#475467',margin:'0 0 14px',lineHeight:1.5}}>
            Colaboradores avaliam a liderança do setor. Cada pessoa seleciona seu nome e o sistema carrega o líder responsável automaticamente.
          </p>
          <code style={{display:'block',background:'#f8fafc',padding:'8px 12px',borderRadius:6,fontSize:12,color:'#0284c7',marginBottom:14,wordBreak:'break-all'}}>
            {leadUrl}
          </code>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button type="button" className="button small primary" disabled={!leadUrl} onClick={()=>void handleCopy(leadUrl, 'f1-url', 'url')}>
              <Copy size={14}/>{copiedLink==='f1-url'?'Link copiado!':'Copiar link'}
            </button>
            <button type="button" className="button small" disabled={!waLeadMsg} onClick={()=>void handleCopy(waLeadMsg, 'f1-wa', 'whatsapp')} style={{color:'#067647'}}>
              {copiedLink==='f1-wa'?'✓ Copiado!':'WhatsApp'}
            </button>
            {leadUrl ? <a className="button small" href={leadUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/>Abrir formulário</a> : <button className="button small" type="button" disabled><ExternalLink size={14}/>Link não configurado</button>}
          </div>
        </div>

        {/* Formulário 2: Equipe */}
        <div style={{background:'#fff',border:'1px solid #bbf7d0',borderRadius:12,padding:'20px',boxShadow:'0 2px 8px rgba(0,0,0,0.03)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
            <span style={{background:'#dcfce7',color:'#15803d',padding:'4px 8px',borderRadius:6,fontSize:11,fontWeight:700}}>PORTAL NATIVO</span>
            <b style={{fontSize:16,color:'#14532d'}}>Avaliação e Autoavaliação da Equipe</b>
          </div>
          <p style={{fontSize:13,color:'#475467',margin:'0 0 14px',lineHeight:1.5}}>
            Autoavaliação individual e avaliação de cooperação entre colegas do mesmo setor. Seleciona o nome e escolhe quem avaliar.
          </p>
          <code style={{display:'block',background:'#f8fafc',padding:'8px 12px',borderRadius:6,fontSize:12,color:'#16a34a',marginBottom:14,wordBreak:'break-all'}}>
            {teamUrl}
          </code>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button type="button" className="button small primary" disabled={!teamUrl} onClick={()=>void handleCopy(teamUrl, 'f2-url', 'url')}>
              <Copy size={14}/>{copiedLink==='f2-url'?'Link copiado!':'Copiar link'}
            </button>
            <button type="button" className="button small" disabled={!waTeamMsg} onClick={()=>void handleCopy(waTeamMsg, 'f2-wa', 'whatsapp')} style={{color:'#067647'}}>
              {copiedLink==='f2-wa'?'✓ Copiado!':'WhatsApp'}
            </button>
            {teamUrl ? <a className="button small" href={teamUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/>Abrir formulário</a> : <button className="button small" type="button" disabled><ExternalLink size={14}/>Link não configurado</button>}
          </div>
        </div>
      </div>

      {/* Seção das 3 Mensagens do WhatsApp Prontas */}
      <Panel title="💬 3 Mensagens prontas para o WhatsApp" subtitle="Textos formatados prontos para copiar e colar para os colaboradores ou no grupo da clínica.">
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))',gap:14}}>
          {/* Opção 1 */}
          <div style={{background:'#f8fafc',border:'1px solid #cbd5e1',borderRadius:10,padding:16,display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                <b style={{fontSize:13,color:'#0f172a'}}>1. Geral (2 Links + Prazo)</b>
                <span style={{background:'#dcfce7',color:'#15803d',padding:'2px 8px',borderRadius:6,fontSize:10,fontWeight:700}}>COMPLETA</span>
              </div>
              <p style={{fontSize:12,color:'#64748b',margin:'0 0 10px'}}>Para o grupo geral com ambos os links.</p>
              <pre style={{whiteSpace:'pre-wrap',fontFamily:'inherit',fontSize:11,background:'#fff',border:'1px solid #e2e8f0',borderRadius:6,padding:10,margin:'0 0 12px',color:'#334155',lineHeight:1.5,maxHeight:140,overflowY:'auto'}}>
                {`Olá, equipe Cardiofitness! 👋\n\nEstá aberto o ciclo de avaliação de desempenho *${cycle?.name || 'Cardiofitness'}*.\n\nPreencham os dois formulários nos links fixos abaixo (basta selecionar seu próprio nome na lista):\n\n1️⃣ *Avaliação de Líderes:*\n${leadUrl}\n\n2️⃣ *Avaliação e Autoavaliação da Equipe:*\n${teamUrl}\n\n⏰ Disponível até ${cycle ? formatDate(cycle.endDate) : 'o prazo do ciclo'}.\nCardiofitness — Gestão de Pessoas`}
              </pre>
            </div>
            <button type="button" className="button small primary" onClick={handleCopyAll} style={{width:'100%',justifyContent:'center',background:copiedType==='all'?'#059669':'#16a34a',borderColor:copiedType==='all'?'#059669':'#16a34a'}}>
              {copiedType==='all'?<Check size={14}/>:<Copy size={14}/>}{copiedType==='all'?'✓ Mensagem copiada!':'Copiar Mensagem 1 (Geral)'}
            </button>
          </div>

          {/* Opção 2 */}
          <div style={{background:'#f8fafc',border:'1px solid #bfdbfe',borderRadius:10,padding:16,display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                <b style={{fontSize:13,color:'#1e3a8a'}}>2. Apenas Líderes</b>
                <span style={{background:'#dbeafe',color:'#1d4ed8',padding:'2px 8px',borderRadius:6,fontSize:10,fontWeight:700}}>LIDERANÇA</span>
              </div>
              <p style={{fontSize:12,color:'#64748b',margin:'0 0 10px'}}>Mensagem individual do Formulário 1.</p>
              <pre style={{whiteSpace:'pre-wrap',fontFamily:'inherit',fontSize:11,background:'#fff',border:'1px solid #e2e8f0',borderRadius:6,padding:10,margin:'0 0 12px',color:'#334155',lineHeight:1.5,maxHeight:140,overflowY:'auto'}}>
                {waLeadMsg}
              </pre>
            </div>
            <button type="button" className="button small" onClick={()=>void handleCopy(waLeadMsg, 'f1-wa-box', 'whatsapp')} style={{width:'100%',justifyContent:'center',color:'#1d4ed8',borderColor:'#93c5fd'}}>
              {copiedLink==='f1-wa-box'?<Check size={14}/>:<Copy size={14}/>}{copiedLink==='f1-wa-box'?'✓ Mensagem copiada!':'Copiar Mensagem 2 (Líderes)'}
            </button>
          </div>

          {/* Opção 3 */}
          <div style={{background:'#f8fafc',border:'1px solid #bbf7d0',borderRadius:10,padding:16,display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                <b style={{fontSize:13,color:'#14532d'}}>3. Apenas Equipe</b>
                <span style={{background:'#dcfce7',color:'#15803d',padding:'2px 8px',borderRadius:6,fontSize:10,fontWeight:700}}>EQUIPE</span>
              </div>
              <p style={{fontSize:12,color:'#64748b',margin:'0 0 10px'}}>Mensagem individual do Formulário 2.</p>
              <pre style={{whiteSpace:'pre-wrap',fontFamily:'inherit',fontSize:11,background:'#fff',border:'1px solid #e2e8f0',borderRadius:6,padding:10,margin:'0 0 12px',color:'#334155',lineHeight:1.5,maxHeight:140,overflowY:'auto'}}>
                {waTeamMsg}
              </pre>
            </div>
            <button type="button" className="button small" onClick={()=>void handleCopy(waTeamMsg, 'f2-wa-box', 'whatsapp')} style={{width:'100%',justifyContent:'center',color:'#15803d',borderColor:'#86efac'}}>
              {copiedLink==='f2-wa-box'?<Check size={14}/>:<Copy size={14}/>}{copiedLink==='f2-wa-box'?'✓ Mensagem copiada!':'Copiar Mensagem 3 (Equipe)'}
            </button>
          </div>
        </div>
      </Panel>

      <LeaderRosterAccordion
        data={data}
        cycle={cycle}
        onOpenEmployee={onOpenEmployee}
        onEditEmployee={onEditEmployee}
        onDeleteEmployee={onDeleteEmployee}
        onAddEmployee={onAddEmployee}
        showStats={false}
        title="Quadro de Colaboradores por Liderança"
        subtitle="Estrutura de líderes e suas equipes na clínica. Clique no líder para abrir seus subordinados."
      />
    </>
  );
}

function Dashboard({data,cycle,onQuickCycle,onConfigure,onResults,onOpenLinks,onNavigate,onEditCycle}:{data:AppData;cycle?:Cycle;onQuickCycle:()=>void;onConfigure:()=>void;onResults:(id:string)=>void;onOpenLinks:()=>void;onNavigate:(view:View)=>void;onEditCycle:(cycle:Cycle)=>void}) {
  const [showWaModal, setShowWaModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState<'lead'|'team'|null>(null);

  if(!cycle)return <Panel><Empty title="Vamos organizar o primeiro ciclo" action={<button className="button primary" onClick={onConfigure}><Plus size={18}/>Configurar o ciclo</button>}>Cadastre os colaboradores, selecione os participantes e vincule os formulários de avaliação.</Empty></Panel>;
  const evaluations=cycleEvaluations(data,cycle.id),responses=cycleResponses(data,cycle.id),expected=expectedTotal(evaluations);
  const leaderIds=new Set(cycle.participants.map(item=>item.leaderId).filter(Boolean));
  const activeEmployees = data.employees.filter(employee=>employee.active);
  const cycleStatus = cycleState(cycle);

  const scores = responses.map(responseAverage).filter((v): v is number => v !== null && !isNaN(v));
  const overallAverage = scores.length ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : null;

  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://cardiofitness-smoky.vercel.app';
  const leadUrl = `${origin}/avaliacao-de-lideres`;
  const teamUrl = `${origin}/avaliacao-da-equipe`;

  async function copyUrl(url: string, type: 'lead'|'team') {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopiedLink(type);
        setTimeout(() => setCopiedLink(null), 3000);
      }
    } catch {}
  }

  return (
    <>
      {showWaModal && <WhatsAppModal cycle={cycle} leadUrl={leadUrl} teamUrl={teamUrl} onClose={() => setShowWaModal(false)} />}

      {/* Barra de Status Compacta e Ações Rápidas do Ciclo */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: '16px 22px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14,
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Pill kind={cycleStatus === 'Em andamento' ? 'green' : 'muted'}>{cycleStatus}</Pill>
          <b style={{ fontSize: 16, color: '#0f172a' }}>{cycle.name}</b>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            Período: <b>{formatDate(cycle.startDate)} a {formatDate(cycle.endDate)}</b>
          </span>
          <span style={{ fontSize: 11, color: '#0284c7', background: '#e0f2fe', padding: '4px 10px', borderRadius: 12, fontWeight: 700 }}>
            Portal Web Cardiofitness (Nativo)
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="button small"
            onClick={() => void copyUrl(leadUrl, 'lead')}
            title="Copiar link direto da Avaliação de Líderes"
          >
            {copiedLink === 'lead' ? <Check size={14} style={{ color: '#16a34a' }} /> : <Copy size={14} />}
            {copiedLink === 'lead' ? 'Link Líderes Copiado!' : 'Copiar Link Líderes'}
          </button>
          <button
            type="button"
            className="button small"
            onClick={() => void copyUrl(teamUrl, 'team')}
            title="Copiar link direto da Avaliação da Equipe"
          >
            {copiedLink === 'team' ? <Check size={14} style={{ color: '#16a34a' }} /> : <Copy size={14} />}
            {copiedLink === 'team' ? 'Link Equipe Copiado!' : 'Copiar Link Equipe'}
          </button>
          <button
            type="button"
            className="button small"
            onClick={() => setShowWaModal(true)}
            style={{ borderColor: '#86efac', color: '#166534', background: '#f0fdf4' }}
            title="Modelos de mensagens formatadas para WhatsApp"
          >
            <MessageCircle size={14} /> Mensagens WhatsApp
          </button>
          <button type="button" className="button small" onClick={() => onEditCycle(cycle)}>
            <CalendarDays size={14} /> Ajustar datas
          </button>
          <button type="button" className="button small primary" onClick={onQuickCycle}>
            <Plus size={15} /> Próximo ciclo
          </button>
        </div>
      </div>

      {/* Grid com 4 KPIs Principais */}
      <div className="stat-grid">
        <Stat
          label="Média Geral da Clínica"
          value={<>{overallAverage !== null ? overallAverage.toFixed(2) : '—'}<em> / 4.0</em></>}
          note="Escala oficial de desempenho"
          icon={<Award size={19}/>}
        />
        <Stat
          label="Respostas recebidas"
          value={<>{responses.length}<em>{expected !== null ? ` / ${expected}` : ''}</em></>}
          note={`${quantity(evaluations.length, 'formulário vinculado', 'formulários vinculados')}`}
          icon={<ClipboardList size={19}/>}
        />
        <Stat
          label="Conclusão do ciclo"
          value={expected ? formatPercent(responses.length, expected) : (responses.length > 0 ? '100%' : '0%')}
          note={expected ? `${quantity(Math.max(0, expected - responses.length), 'resposta pendente', 'respostas pendentes')}` : 'Ciclo em andamento'}
          icon={<CheckCircle2 size={19}/>}
        />
        <Stat
          label="Colaboradores ativos"
          value={activeEmployees.length}
          note={`${quantity(leaderIds.size, 'liderança vinculada', 'lideranças vinculadas')}`}
          icon={<UsersRound size={19}/>}
        />
      </div>

      {/* Painel Analítico Completo (Comparativo de Ciclos, Gráficos Coloridos por Setor e Proporção das Notas) */}
      <EvolutionDashboard data={data} activeCycleId={cycle.id}/>
    </>
  );
}

function CycleLinks({forms,cycle,onOpenWhatsAppModal}:{forms:Evaluation[];cycle:Pick<Cycle,'startDate'|'endDate'> & {id?:string;name?:string};onOpenWhatsAppModal?:()=>void}) {
  const [copied,setCopied]=useState(''),[error,setError]=useState('');
  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://cardiofitness-smoky.vercel.app';
  const leadUrl = `${origin}/avaliacao-de-lideres`;
  const teamUrl = `${origin}/avaliacao-da-equipe`;

  const waLeadMsg = `Olá! 👋\n\nEstá aberto o ciclo de avaliação *${cycle?.name || 'Cardiofitness'}*.\n\nAcesse o link abaixo para preencher a *Avaliação de Líderes* (basta selecionar seu nome na lista):\n${leadUrl}\n\nPeríodo aberto até ${formatDate(cycle.endDate)}.\nCardiofitness — Gestão de Pessoas`;
  const waTeamMsg = `Olá! 👋\n\nEstá aberto o ciclo de avaliação *${cycle?.name || 'Cardiofitness'}*.\n\nAcesse o link abaixo para preencher a *Avaliação e Autoavaliação da Equipe* (basta selecionar seu nome na lista):\n${teamUrl}\n\nPeríodo aberto até ${formatDate(cycle.endDate)}.\nCardiofitness — Gestão de Pessoas`;

  async function copyLink(url:string){
    if(!url){setError('Endereço indisponível.');return;}
    try {
      if(!navigator.clipboard?.writeText)throw new Error('Clipboard indisponível');
      await navigator.clipboard.writeText(url);setCopied(url);setError('');
      setTimeout(()=>setCopied(''),3000);
    } catch {setError('Não foi possível copiar automaticamente. Endereço: ' + url);}
  }
  return <div className="quick-link-list">
    <div className="quick-link" style={{background:'#f0f7fd',borderColor:'#c5def1',padding:'12px 16px',borderRadius:8}}>
      <div>
        <b style={{color:'#0573b9',fontSize:14}}>Formulário 1: Avaliação de Líderes</b>
        <small style={{display:'block',marginTop:2}}>Portal Nativo · {leadUrl}</small>
      </div>
      <div className="quick-actions">
        <button type="button" className="button small primary" onClick={()=>void copyLink(leadUrl)}>
          <Copy size={15}/>{copied===leadUrl?'Link copiado!':'Copiar link'}
        </button>
        <button type="button" className="button small" onClick={()=>void copyLink(waLeadMsg)} style={{color:'#067647'}}>
          {copied===waLeadMsg?'✓ Copiado!':'WhatsApp'}
        </button>
        <a className="button small" href={leadUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>Abrir formulário</a>
      </div>
    </div>

    <div className="quick-link" style={{background:'#f0fdf4',borderColor:'#bbf7d0',padding:'12px 16px',borderRadius:8}}>
      <div>
        <b style={{color:'#16a34a',fontSize:14}}>Formulário 2: Avaliação e Autoavaliação da Equipe</b>
        <small style={{display:'block',marginTop:2}}>Portal Nativo · {teamUrl}</small>
      </div>
      <div className="quick-actions">
        <button type="button" className="button small primary" onClick={()=>void copyLink(teamUrl)}>
          <Copy size={15}/>{copied===teamUrl?'Link copiado!':'Copiar link'}
        </button>
        <button type="button" className="button small" onClick={()=>void copyLink(waTeamMsg)} style={{color:'#067647'}}>
          {copied===waTeamMsg?'✓ Copiado!':'WhatsApp'}
        </button>
        <a className="button small" href={teamUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>Abrir formulário</a>
      </div>
    </div>

    {onOpenWhatsAppModal && (
      <div style={{marginTop:8}}>
        <button type="button" className="button small" onClick={onOpenWhatsAppModal} style={{borderColor:'#86efac',color:'#166534',background:'#f0fdf4'}}>
          <MessageCircle size={15}/>Ver as 3 Mensagens do WhatsApp
        </button>
      </div>
    )}

    {error&&<Notice message={error}/>}
  </div>;
}
function QuickCycleHome({data,cycle,onQuickCycle,onConfigure,onOpenLinks}:{data:AppData;cycle:Cycle;onQuickCycle:()=>void;onConfigure:()=>void;onOpenLinks:()=>void}) {
  const [showWaModal, setShowWaModal] = useState(false);
  const forms=cycleEvaluations(data,cycle.id);
  const next=suggestNextCycle(data);
  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://cardiofitness-smoky.vercel.app';
  const leadUrl = `${origin}/avaliacao-de-lideres`;
  const teamUrl = `${origin}/avaliacao-da-equipe`;

  return <section className="quick-launch" aria-labelledby="quick-launch-title">
    {showWaModal && <WhatsAppModal cycle={cycle} leadUrl={leadUrl} teamUrl={teamUrl} onClose={()=>setShowWaModal(false)}/>}
    <div className="quick-launch-head">
      <div><span className="quick-kicker">PORTAL DE AVALIAÇÃO · LINKS DO CICLO</span><h2 id="quick-launch-title">Links de avaliação do ciclo</h2><p>Compartilhe os links oficiais com a equipe e com as lideranças. As respostas entram no painel em tempo real.</p></div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <button type="button" className="button" onClick={()=>setShowWaModal(true)} style={{borderColor:'#86efac',color:'#166534',background:'#f0fdf4'}}>
          <MessageCircle size={17}/>Mensagens WhatsApp (3)
        </button>
        <button type="button" className="button" onClick={onOpenLinks}><ExternalLink size={17}/>Ver links dos formulários (2)</button>
        <button type="button" className="button primary" disabled={!next} onClick={onQuickCycle}><Plus size={18}/>Criar próximo ciclo</button>
      </div>
    </div>
    <div className="quick-launch-bottom">
      <div className="quick-link-title"><b>Links do ciclo: {cycle.name}</b><small>{formatDate(cycle.startDate)} a {formatDate(cycle.endDate)}</small></div>
      <CycleLinks forms={forms} cycle={cycle} onOpenWhatsAppModal={()=>setShowWaModal(true)}/>
      <p className="quick-help">Envie os links do portal de avaliação para o ciclo. As médias e os relatórios são atualizados em tempo real. <button className="text-button" type="button" onClick={onConfigure}>Configurações avançadas</button></p>
    </div>
  </section>;
}
function QuickCycleEditor({data,onClose,onConfigure,onCreated}:{data:AppData;onClose:()=>void;onConfigure:()=>void;onCreated:(id:string)=>void}) {
  const {prepareCycle}=useApp();
  const [draft]=useState(()=>suggestNextCycle(data));
  const [created,setCreated]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function create(){
    if(!draft||draft.error||busy||created)return;
    setBusy(true);setError('');
    try {const saved=await prepareCycle(draft.input,draft.source.id);onCreated(saved.id);setCreated(true);}
    catch(e){setError(errorMessage(e));}
    finally{setBusy(false);}
  }
  return <Modal title={created?'Ciclo criado com sucesso':'Criar próximo ciclo'} subtitle="Um ciclo novo, os mesmos formulários" onClose={onClose}>
    <div className="modal-body quick-modal-body">
      {!draft?<><Notice message="Cadastre o primeiro ciclo e configure um formulário uma única vez."/ ><button className="button" type="button" onClick={onConfigure}>Ir para configurações</button></>:
      <>{created?<Notice success message={`${draft.input.name} criado. Formulários vinculados ao novo ciclo.`}/>:<p>Confira o período sugerido. Ao confirmar, o sistema registra os participantes ativos e vincula os formulários de avaliação.</p>}
      <div className="quick-cycle-summary"><div><small>Próximo período</small><b>{draft.input.name}</b><span>{formatDate(draft.input.startDate)} a {formatDate(draft.input.endDate)}</span></div><div><small>Colaboradores ativos</small><b>{draft.input.participants.length}</b><span>Vínculos atuais do cadastro</span></div><div><small>Formulários</small><b>{draft.forms.length}</b><span>Avaliações vinculadas</span></div></div>
      {!created&&draft.error&&<Notice message={draft.error}/>}
      {!created&&draft.warnings.map((warning,i)=><p className="quick-warning" key={i}><ShieldCheck size={16}/>{warning}</p>)}
      {created&&<><h3>Links de avaliação</h3><CycleLinks forms={draft.forms} cycle={draft.input}/><p className="quick-help">Compartilhe os links do portal de avaliação vinculados a este ciclo.</p></>}
      </>}
      {error&&<Notice message={error}/>}
    </div>
    <div className="modal-actions">
      {created?<button className="button primary" type="button" onClick={onClose}>Concluir</button>:<>
        <button className="button" type="button" onClick={onClose}>Cancelar</button>
        <button className="button primary" type="button" disabled={!draft||!!draft.error||busy} onClick={()=>void create()}>{busy?<LoaderCircle className="spin" size={17}/>:<Plus size={17}/>}Criar ciclo e manter links</button>
      </>}
    </div>
  </Modal>;
}

function Employees({data,cycle,onOpen,onEdit,onDeactivate,onDelete,onAdd}:{data:AppData;cycle?:Cycle;onOpen:(id:string)=>void;onEdit:(employee:Employee)=>void;onDeactivate:(employee:Employee)=>void;onDelete:(employee:Employee)=>void;onAdd?:()=>void}) {
  return (
    <LeaderRosterAccordion
      data={data}
      cycle={cycle}
      onOpenEmployee={onOpen}
      onEditEmployee={onEdit}
      onDeleteEmployee={onDelete}
      onAddEmployee={onAdd}
      showStats={true}
      title="Colaboradores por Liderança"
      subtitle="Exibe as lideranças da clínica. Clique em cada líder para abrir os colaboradores subordinados."
    />
  );
}

function EmployeeDetail({data,employee,cycleId,onEdit,onResults}:{data:AppData;employee:Employee;cycleId:string;onEdit:()=>void;onResults:(id:string)=>void}) {
  const received=cycleResponses(data,cycleId).filter(response=>response.subjectId===employee.id);const kinds:EvaluationKind[]=['leadership','team','self','leader_to_employee'];const applicable=kinds.filter(kind=>data.responses.some(response=>response.subjectId===employee.id&&response.kind===kind));const participant=data.cycles.find(cycle=>cycle.id===cycleId)?.participants.find(item=>item.employeeId===employee.id);const leaderId=participant?participant.leaderId:employee.leaderId;
  return <><Panel className="person-summary"><Avatar name={employee.name} large/><div className="person-summary-info"><h2>{employee.name}</h2><p>{employee.department} · {employee.email||'E-mail não informado'}</p></div><Pill kind={employee.active?'green':'muted'}>{employee.active?'Ativo':'Inativo'}</Pill><div className="person-leader"><small>LIDERANÇA NO CICLO</small><b>{leaderId?person(data,leaderId)?.name||'Não encontrada':'Sem vínculo'}</b></div><button className="button" onClick={onEdit}><Pencil size={16}/>Editar cadastro</button></Panel><div className="stat-grid detail-stats">{(applicable.length?applicable:['team','self'] as EvaluationKind[]).map(kind=>{const list=received.filter(response=>response.kind===kind);return <Stat key={kind} label={KIND_LABELS[kind]} value={<>{formatNumber(mean(list.map(responseAverage).filter((n):n is number=>n!==null)))}<em> / 4</em></>} note={`${quantity(list.length,'resposta recebida','respostas recebidas')} neste ciclo`}/>;})}</div><div className="detail-grid"><Panel title="Notas por pergunta" subtitle="Médias por perspectiva · Escala de 1 a 4">{!received.length?<Empty title="Sem resultados neste ciclo">As respostas aparecerão após a sincronização do formulário.</Empty>:cycleEvaluations(data,cycleId).filter(evaluation=>received.some(response=>response.evaluationId===evaluation.id)).map(evaluation=><div className="question-group" key={evaluation.id}><button className="text-button" onClick={()=>onResults(evaluation.id)}>{evaluation.name}<ArrowRight size={15}/></button>{kinds.filter(kind=>received.some(response=>response.evaluationId===evaluation.id&&response.kind===kind)).map(kind=><div key={kind}><h3 className="section-caption">{KIND_LABELS[kind]}</h3><QuestionBars sections={evaluation.questionSections} questions={evaluation.mapping.scoreQuestions} responses={received.filter(response=>response.evaluationId===evaluation.id&&response.kind===kind)}/></div>)}</div>)}</Panel><Panel title="Histórico individual" subtitle="Médias de cada perspectiva, preservadas por ciclo"><div className="history-legend">{applicable.map((kind,index)=><span key={kind}><i style={{background:['#163064','#009BD2','#527AAB','#00A7C7'][index]}}/>{KIND_LABELS[kind]}</span>)}</div><HistoryChart data={data} employeeId={employee.id} kinds={applicable}/><div className="table-scroll"><table className="compact-table"><thead><tr><th>Ciclo</th>{applicable.map(kind=><th key={kind}>{kind==='self'?'Própria':kind==='team'?'Equipe':kind==='leadership'?'Líderes':'Líder'}</th>)}</tr></thead><tbody>{[...data.cycles].sort((a,b)=>b.startDate.localeCompare(a.startDate)).map(cycle=><tr key={cycle.id}><td>{cycle.name}</td>{applicable.map(kind=><td key={kind}>{formatNumber(mean(cycleResponses(data,cycle.id).filter(response=>response.subjectId===employee.id&&response.kind===kind).map(responseAverage).filter((n):n is number=>n!==null)))}</td>)}</tr>)}</tbody></table></div></Panel></div></>;
}

function QuestionBars({questions,responses,sections}:{questions:Evaluation['mapping']['scoreQuestions'];responses:EvaluationResponse[];sections?:Record<string,string>}) {
  const groups=questionGroups(questions,responses,sections);
  return <div className="question-bars"><ScoreLegend/>{groups.map(group=><section className="question-section" key={group.section} aria-label={group.section}><h3>{group.section}</h3>{group.rows.map(({question,average,count})=><div className="question-bar" key={question.id}><span>{question.title}<small>{quantity(count,'resposta')}</small></span><div className="score-track"><i style={{width:`${average/question.max*100}%`,background:scoreColor(average)}}/></div><b><Score value={average}/></b></div>)}</section>)}{!groups.length&&<p className="muted">Nenhuma pergunta com respostas neste recorte.</p>}</div>;
}
function HistoryChart({data,employeeId,kinds}:{data:AppData;employeeId:string;kinds:EvaluationKind[]}) {
  const cycles=[...data.cycles].sort((a,b)=>a.startDate.localeCompare(b.startDate));if(!kinds.length)return <Empty title="Histórico ainda vazio">As médias por ciclo aparecerão aqui.</Empty>;
  const x=(index:number)=>48+(cycles.length===1?200:index/(cycles.length-1)*440),y=(value:number)=>192-(value-1)/3*154;
  return <svg className="history-chart" viewBox="0 0 540 240" role="img" aria-label="Histórico de médias por ciclo, na escala de 1 a 4">{[1,2,3,4].map(value=><g key={value}><line x1="42" y1={y(value)} x2="514" y2={y(value)} stroke="#E7EBF0"/><text x="24" y={y(value)+4}>{value}</text></g>)}{cycles.map((cycle,index)=><text key={cycle.id} x={x(index)} y="223" textAnchor="middle">{cycle.startDate.slice(5,7)}/{cycle.startDate.slice(2,4)}–{cycle.endDate.slice(5,7)}/{cycle.endDate.slice(2,4)}</text>)}{kinds.map((kind,index)=>{const values=cycles.map(cycle=>mean(cycleResponses(data,cycle.id).filter(response=>response.subjectId===employeeId&&response.kind===kind).map(responseAverage).filter((n):n is number=>n!==null)));const color=['#163064','#009BD2','#527AAB','#00A7C7'][index];return <g key={kind}>{values.map((value,i)=>value!==null&&<g key={i}>{i>0&&values[i-1]!==null&&<line x1={x(i-1)} y1={y(values[i-1]!)} x2={x(i)} y2={y(value)} stroke={color} strokeWidth="2.5"/>}<circle cx={x(i)} cy={y(value)} r="5" stroke={color} strokeWidth="2" fill="white"/><title>{KIND_LABELS[kind]} · {cycles[i].name}: {formatNumber(value)}</title></g>)}</g>;})}</svg>;
}

function Evaluations({data,cycle,onResults,onConfigure}:{data:AppData;cycle?:Cycle;onResults:(id:string)=>void;onConfigure:()=>void}) {
  const evaluations=cycle?cycleEvaluations(data,cycle.id):[];
  return <><div className="info-banner"><ClipboardList size={26}/><div><b>Portal Web Cardiofitness (Nativo)</b><p>As respostas são gravadas em tempo real diretamente no Supabase com validação e segurança.</p></div></div><div className="section-heading"><h2>Formulários do ciclo</h2>{cycle&&<><Pill kind={cycleState(cycle)==='Em andamento'?'green':'muted'}>{cycleState(cycle)}</Pill><span>{formatDate(cycle.startDate)} a {formatDate(cycle.endDate)}</span></>}</div>{evaluations.length?<div className="evaluation-grid">{evaluations.map(evaluation=>{const stats=getEvaluationStats(data,evaluation.id);const self=stats.responses.filter(response=>response.kind==='self').length;const health=syncHealth(evaluation,cycle);return <Panel key={evaluation.id} className="evaluation-card"><div className="evaluation-card-top"><span className="form-icon"><ClipboardList size={25}/></span><Pill kind={health.kind}>{health.label}</Pill></div><h2>{evaluation.name}</h2><p className="muted">{evaluation.kind==='team'?'Avaliação entre colegas e autoavaliação':'Avaliação da liderança responsável pelo setor'}</p><div className="evaluation-count"><strong>{stats.received}</strong><span>{stats.expected!==null?`de ${quantity(stats.expected,'resposta')}`:stats.received===1?'resposta recebida':'respostas recebidas'}</span></div><Progress received={stats.received} expected={stats.expected}/><div className="evaluation-meta"><span>{stats.pending!==null?quantity(stats.pending,'pendente'):'Total esperado não definido'}</span><b>{formatPercent(stats.received,stats.expected)}</b></div>{evaluation.kind==='team'&&<div className="form-split"><span>{stats.received-self} entre colegas</span><span>{quantity(self,'autoavaliação','autoavaliações')}</span></div>}<div style={{display:'flex',gap:10,marginTop:16}}><button className="button primary full" onClick={()=>onResults(evaluation.id)}><BarChart3 size={18}/>Ver resultados<ArrowRight size={17}/></button></div><div className="evaluation-sync"><span><Check size={15} style={{color:'#059669'}}/>Portal Web Ativo (Sincronização em tempo real)</span></div></Panel>;})}</div>:<Panel><Empty title={cycle?'Vincule os formulários deste ciclo':'Nenhum ciclo cadastrado'} action={<button className="button primary" onClick={onConfigure}><Plus size={18}/>Configurar avaliações</button>}>Os formulários de avaliação estão disponíveis nas configurações.</Empty></Panel>}</>;
}

function Pending({data,cycleId,onPerson,onConfigure}:{data:AppData;cycleId:string;onPerson:(id:string)=>void;onConfigure:()=>void}) {
  const [exporting,setExporting]=useState<'pdf'|'xlsx'|null>(null),[exportError,setExportError]=useState('');const [evaluationId,setEvaluationId]=useState(''),[department,setDepartment]=useState(''),[query,setQuery]=useState(''),[status,setStatus]=useState('pending'),[page,setPage]=useState(1);
  const evaluations=cycleEvaluations(data,cycleId),selectedEvaluation=evaluations.some(item=>item.id===evaluationId)?evaluationId:'';
  const syncEvaluations=evaluations.filter(evaluation=>!selectedEvaluation||evaluation.id===selectedEvaluation);
  const syncIsVerified=syncEvaluations.length>0&&syncEvaluations.every(evaluation=>{
    const lastSyncAt=evaluation.lastSyncedAt?Date.parse(evaluation.lastSyncedAt):Number.NaN;
    const status=syncHealth(evaluation,data.cycles.find(cycle=>cycle.id===cycleId)).label;
    return evaluation.expectedResponses!==null&&(evaluation.sourceType==='native'||Number.isFinite(lastSyncAt))&&(status==='Consulta recente'||status==='Histórico preservado'||status==='Coleta nativa ativa');
  });
  const participationRows=getParticipation(data,cycleId,selectedEvaluation||undefined);
  const rows=syncIsVerified?participationRows:participationRows.map(row=>({...row,status:'unconfigured' as const}));
  const departments=[...new Set(rows.map(row=>row.employee.department))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const selectedDepartment=departments.includes(department)?department:'';
  const scoped=rows.filter(row=>(!selectedDepartment||row.employee.department===selectedDepartment)&&row.employee.name.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  const filtered=scoped.filter(row=>status==='all'||(status==='pending'?(row.status==='not_started'||row.status==='partial'):row.status===status));
  const effectivePage=Math.min(page,Math.max(1,Math.ceil(filtered.length/8)));
  const statusLabels={not_started:'Não iniciou',partial:'Em andamento',completed:'Concluiu',unconfigured:'A conferir'};
  useEffect(()=>{setPage(1);},[cycleId]);
  return <>
    <div className="info-banner pending-explanation"><UserRoundCheck size={26}/><div><b>Quem respondeu, e o que ainda falta responder.</b><p>A lista usa os participantes, vínculos do ciclo e respostas importadas na última sincronização bem-sucedida. Confira a última consulta em Avaliações antes de tratar o status como atual. Receber uma avaliação de outra pessoa não significa ter respondido.</p></div></div>
    {syncIsVerified&&<div className="stat-grid three">
      <Stat label="Não iniciaram" value={scoped.filter(row=>row.status==='not_started').length} note="Participações sem resposta registrada" icon={<CircleOff size={19}/>}/>
      <Stat label="Em andamento" value={scoped.filter(row=>row.status==='partial').length} note="Já responderam, mas ainda têm pendências" icon={<ClipboardList size={19}/>}/>
      <Stat label="Concluíram" value={scoped.filter(row=>row.status==='completed').length} note="Todas as pessoas esperadas avaliadas" icon={<Check size={19}/>}/>
    </div>}
    {!syncIsVerified&&<div className="notice notice-error" role="status">A sincronização está ausente, atrasada, com erros ou sem total esperado configurado. O painel não pode confirmar o status atual; atualize a consulta em Avaliações e confira as configurações.</div>}
    {syncIsVerified&&scoped.some(row=>row.status==='unconfigured')&&<div className="notice notice-error" role="status">{quantity(scoped.filter(row=>row.status==='unconfigured').length,'participação a conferir','participações a conferir')}: confira as perguntas numéricas, o total esperado e os vínculos do ciclo. Selecione “A conferir” para consultar.</div>}
    {exportError&&<Notice message={exportError}/>}
    <Panel title="Participação por pessoa e formulário" subtitle="Abra as pendências para ver quem ainda precisa ser avaliado." action={<div className="report-export">{(['pdf','xlsx'] as const).map(format=><button key={format} className="button small" disabled={!filtered.length||!!exporting} onClick={async()=>{setExporting(format);setExportError('');try{await downloadPending(filtered,data.cycles.find(c=>c.id===cycleId)?.name||'Ciclo',format);}catch(error){setExportError(errorMessage(error));}finally{setExporting(null);}}}>{exporting===format?'Exportando…':format==='pdf'?'Pendências PDF':'Pendências Excel'}</button>)}</div>}>
      <div className="table-filters pending-filters">
        <label className="search-field"><Search size={18}/><span className="sr-only">Buscar participante</span><input placeholder="Buscar participante" value={query} onChange={event=>{setQuery(event.target.value);setPage(1);}}/></label>
        <select aria-label="Filtrar por formulário" value={selectedEvaluation} onChange={event=>{setEvaluationId(event.target.value);setPage(1);}}><option value="">Todos os formulários</option>{evaluations.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select aria-label="Filtrar por setor" value={selectedDepartment} onChange={event=>{setDepartment(event.target.value);setPage(1);}}><option value="">Todos os setores</option>{departments.map(item=><option key={item} value={item}>{item}</option>)}</select>
        <select aria-label="Filtrar por participação" value={status} onChange={event=>{setStatus(event.target.value);setPage(1);}}><option value="pending">Com pendências</option><option value="not_started">Não iniciou</option><option value="partial">Em andamento</option><option value="completed">Concluiu</option><option value="unconfigured">A conferir</option><option value="all">Todos os status</option></select>
      </div>
      <div className="table-scroll"><table className="pending-table"><thead><tr><th>Participante</th><th>Setor</th><th>Formulário</th><th>Respondidas / esperadas</th><th>Status e pendências</th></tr></thead><tbody>{filtered.slice((effectivePage-1)*8,effectivePage*8).map(row=><tr key={`${row.employee.id}-${row.evaluation.id}`}><td><button className="text-button" onClick={()=>onPerson(row.employee.id)}>{row.employee.name}</button></td><td>{row.employee.department}</td><td>{row.evaluation.name}</td><td className="strong">{row.status==='unconfigured'?'—':`${row.completed} / ${row.expected}`}</td><td><Pill kind={row.status==='completed'?'green':row.status==='unconfigured'?'muted':'amber'}>{statusLabels[row.status]}</Pill>{row.pendingSubjects.length>0&&row.status!=='unconfigured'&&<details className="pending-subjects"><summary>{quantity(row.pendingSubjects.length,'avaliação pendente','avaliações pendentes')}</summary><ul>{row.pendingSubjects.map(subject=><li key={subject.id}>{subject.name}{subject.id===row.employee.id?' (autoavaliação)':''}</li>)}</ul></details>}{row.status==='unconfigured'&&<small className="pending-configuration">Confira a sincronização, o total esperado, o mapeamento e os vínculos do ciclo.</small>}</td></tr>)}</tbody></table></div>
      {!filtered.length&&<Empty title={!evaluations.length?'Nenhum formulário vinculado ao ciclo':'Nenhuma participação neste filtro'} action={!evaluations.length?<button className="button primary" onClick={onConfigure}>Configurar avaliações</button>:undefined}>{!evaluations.length?'Vincule os formulários e confira os participantes nas configurações.':'Selecione outro status ou ajuste os filtros para conferir as participações.'}</Empty>}
      <Pager page={effectivePage} total={filtered.length} setPage={setPage}/>
    </Panel>
  </>;
}

function Result({data,evaluation,onPerson}:{data:AppData;evaluation:Evaluation;onPerson:(id:string)=>void}) {
  const [query,setQuery]=useState(''),[kind,setKind]=useState('all'),[page,setPage]=useState(1),[textPage,setTextPage]=useState(1);const stats=getEvaluationStats(data,evaluation.id),cycle=data.cycles.find(cycle=>cycle.id===evaluation.cycleId);const responses=stats.responses.filter(response=>(kind==='all'||response.kind===kind)&&`${person(data,response.subjectId)?.name} ${person(data,response.respondentId)?.name}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))).sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt));const displayedAverage=mean(responses.map(responseAverage).filter((n):n is number=>n!==null));
  const effectivePage=Math.min(page,Math.max(1,Math.ceil(responses.length/8)));
  const textResponses=responses.filter(response=>response.textAnswers?.some(item=>item.answer.trim()));
  const effectiveTextPage=Math.min(textPage,Math.max(1,Math.ceil(textResponses.length/8)));
  return <><div className="result-context"><Pill kind="muted">{cycle?.name||'Ciclo não encontrado'}</Pill><span>Escala de 1 a 4</span><span>{evaluation.kind==='team'?'Equipe e autoavaliação separadas pelo tipo de resposta':'Respostas identificadas'}</span></div><div className="stat-grid three"><Stat label="Respostas recebidas" value={<>{stats.received}<em>{stats.expected!==null?` / ${stats.expected}`:''}</em></>} note={stats.pending!==null?`${quantity(stats.pending,'resposta pendente','respostas pendentes')}`:'Total esperado não definido'} icon={<ClipboardList size={19}/>}/><Stat label="Participação" value={formatPercent(stats.received,stats.expected)} note="Em relação ao total esperado" icon={<UsersRound size={19}/>}/><Stat label={kind==='all'&&!query?'Média do formulário':'Média do recorte'} value={<><Score value={displayedAverage}/><em> / 4</em></>} note={kind==='all'?'Todas as respostas do formulário':KIND_LABELS[kind as EvaluationKind]}/></div>{evaluation.kind==='team'&&<div className="result-kind-switch" role="group" aria-label="Perspectiva das respostas">{[['all','Todas as respostas'],['team','Entre colegas'],['self','Autoavaliações']].map(([value,label])=><button type="button" aria-pressed={kind===value} className={kind===value?'active':''} key={value} onClick={()=>{setKind(value);setPage(1);setTextPage(1);}}>{label}<span>{value==='all'?stats.received:stats.responses.filter(response=>response.kind===value).length}</span></button>)}</div>}<div className="result-grid"><Panel title="Média por pergunta" subtitle={`${quantity(responses.length,'resposta')} no recorte selecionado`}><QuestionBars sections={evaluation.questionSections} questions={evaluation.mapping.scoreQuestions} responses={responses}/></Panel><Panel title="Distribuição das notas" subtitle="Quantidade de notas por valor da escala"><Distribution responses={responses}/></Panel></div><Panel title="Respostas identificadas" subtitle="Pessoa avaliada, respondente e data de envio"><div className="table-filters"><label className="search-field"><Search size={18}/><span className="sr-only">Buscar nas respostas</span><input value={query} onChange={event=>{setQuery(event.target.value);setPage(1);setTextPage(1);}} placeholder="Buscar pessoa avaliada ou respondente"/></label><span className="record-count">{quantity(responses.length,'resposta')}</span></div><div className="table-scroll"><table><thead><tr><th>Pessoa avaliada</th><th>Respondente</th><th>Data</th><th>Média</th><th>Perspectiva</th></tr></thead><tbody>{responses.slice((effectivePage-1)*8,effectivePage*8).map(response=><tr key={response.id}><td><button className="text-button" onClick={()=>onPerson(response.subjectId)}>{person(data,response.subjectId)?.name||'Pessoa não encontrada'}</button></td><td>{person(data,response.respondentId)?.name||'Pessoa não encontrada'}</td><td>{formatDate(response.submittedAt)}</td><td className="score-cell"><Score value={responseAverage(response)}/></td><td><Pill kind={response.kind==='self'?'muted':'green'}>{KIND_LABELS[response.kind]}</Pill></td></tr>)}</tbody></table></div>{!responses.length&&<Empty title="Nenhuma resposta neste recorte">Ajuste a busca ou sincronize as respostas do formulário.</Empty>}<Pager page={effectivePage} total={responses.length} setPage={setPage}/></Panel><Panel title="Respostas de texto" subtitle="Feedbacks e comentários digitados pelos colaboradores nas avaliações do ciclo." className="text-responses-panel">{textResponses.length?<><div className="text-responses">{textResponses.slice((effectiveTextPage-1)*8,effectiveTextPage*8).map(response=><article className="text-response" key={response.id} aria-label={`Resposta de ${person(data,response.respondentId)?.name||'Pessoa não encontrada'}`}><header className="text-response-meta"><div><span>Respondente</span><strong>{person(data,response.respondentId)?.name||'Pessoa não encontrada'}</strong></div><div><span>Pessoa avaliada</span><button type="button" className="text-button" onClick={()=>onPerson(response.subjectId)}>{person(data,response.subjectId)?.name||'Pessoa não encontrada'}</button></div><div><span>Enviado em</span><time dateTime={response.submittedAt}>{formatDate(response.submittedAt)}</time></div><Pill kind={response.kind==='self'?'muted':'green'}>{KIND_LABELS[response.kind]}</Pill></header><dl className="text-response-answers">{response.textAnswers?.filter(item=>item.answer.trim()).map(item=><div key={item.questionId}><dt>{item.question}</dt><dd>{item.answer}</dd></div>)}</dl></article>)}</div><Pager page={effectiveTextPage} total={textResponses.length} setPage={setTextPage}/></>:<Empty title="Nenhuma resposta de texto neste recorte">Os textos preenchidos aparecem automaticamente após a sincronização. Perguntas sem resposta não são exibidas. Confira os filtros acima ou use “Sincronizar” na avaliação para atualizar as respostas já enviadas.</Empty>}</Panel></>;
}
function Distribution({responses}:{responses:EvaluationResponse[]}) { const scores=responses.flatMap(response=>Object.values(response.scores));const counts=[1,2,3,4].map(score=>scores.filter(value=>value===score).length),max=Math.max(1,...counts);return <div className="distribution"><ScoreLegend/><div className="distribution-chart" role="img" aria-label={counts.map((count,index)=>`Nota ${index+1}: ${quantity(count,'ocorrência')}`).join('; ')}>{counts.map((count,index)=><div className="distribution-col" key={index}><span>{count}</span><i style={{height:`${count/max*120}px`,background:scoreColor(index+1)}}/><b>{index+1}</b></div>)}</div><p>{quantity(scores.length,'nota')} nas respostas selecionadas</p></div>; }

function Reports({data,cycleId,onError}:{data:AppData;cycleId:string;onError:(message:string)=>void}) {
  const {mode}=useApp();
  const [evaluationId,setEvaluationId]=useState(''),[employeeId,setEmployeeId]=useState(''),[busy,setBusy]=useState('');const evaluations=cycleEvaluations(data,cycleId),selectedId=evaluations.some(evaluation=>evaluation.id===evaluationId)?evaluationId:'';const responses=cycleResponses(data,cycleId).filter(response=>(!selectedId||response.evaluationId===selectedId)&&(!employeeId||response.subjectId===employeeId));
  async function exportFile(format:'pdf'|'xlsx'){setBusy(format);try{await downloadReport(data,{cycleId,evaluationId:selectedId||undefined,employeeId:employeeId||undefined},format,mode==='demo');}catch(error){onError(errorMessage(error));}finally{setBusy('');}}
  return <><Panel title="Monte seu relatório" subtitle="O arquivo respeita o ciclo e os filtros selecionados"><div className="report-filters"><Field label="Avaliação"><select value={selectedId} onChange={event=>setEvaluationId(event.target.value)}><option value="">Todas as avaliações</option>{evaluations.map(evaluation=><option key={evaluation.id} value={evaluation.id}>{evaluation.name}</option>)}</select></Field><Field label="Pessoa avaliada"><select value={employeeId} onChange={event=>setEmployeeId(event.target.value)}><option value="">Todos os colaboradores</option>{data.employees.map(employee=><option value={employee.id} key={employee.id}>{employee.name}</option>)}</select></Field><div className="report-export"><button className="button primary" disabled={!responses.length||!!busy} onClick={()=>void exportFile('pdf')}>{busy==='pdf'?<LoaderCircle className="spin" size={18}/>:<ArrowDownToLine size={18}/>}Exportar PDF</button><button className="button" disabled={!responses.length||!!busy} onClick={()=>void exportFile('xlsx')}>{busy==='xlsx'?<LoaderCircle className="spin" size={18}/>:<FileSpreadsheet size={18}/>}Exportar Excel</button></div></div></Panel><div className="report-summary"><span className="form-icon"><BarChart3 size={25}/></span><div><h2>{data.cycles.find(cycle=>cycle.id===cycleId)?.name||'Selecione um ciclo'}</h2><p>{quantity(responses.length,'resposta')} · {quantity(new Set(responses.map(response=>response.subjectId)).size,'pessoa avaliada','pessoas avaliadas')} · {quantity(new Set(responses.map(response=>response.evaluationId)).size,'formulário')}</p></div><Pill kind="muted">Prévia do relatório</Pill></div><Panel title="Resultados por pessoa, formulário e perspectiva" subtitle="Cada média reúne somente as respostas da mesma avaliação e perspectiva"><div className="table-scroll"><table><thead><tr><th>Colaborador</th><th>Setor</th><th>Avaliação</th><th>Respostas</th><th>Média / 4</th></tr></thead><tbody>{data.employees.flatMap(employee=>evaluations.flatMap(evaluation=>(Object.keys(KIND_LABELS) as EvaluationKind[]).map(kind=>{const subset=responses.filter(response=>response.subjectId===employee.id&&response.evaluationId===evaluation.id&&response.kind===kind);return subset.length?<tr key={`${employee.id}-${evaluation.id}-${kind}`}><td className="strong">{employee.name}</td><td>{employee.department}</td><td><span className="strong">{evaluation.name}</span><br/><small>{KIND_LABELS[kind]}</small></td><td>{subset.length}</td><td className="score-cell"><Score value={mean(subset.map(responseAverage).filter((n):n is number=>n!==null))}/></td></tr>:null;})))}</tbody></table></div>{!responses.length&&<Empty title="Sem respostas para exportar">Selecione outro ciclo ou ajuste os filtros.</Empty>}</Panel><CycleComparison data={data}/><p className="report-foot"><ShieldCheck size={17}/>Relatórios contêm respostas identificadas. Uso exclusivo do RH.</p></>;
}

function PasswordSettings({required=false}:{required?:boolean}) {
  const app=useApp();const [current,setCurrent]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(false);
  async function submit(event:FormEvent){event.preventDefault();setError('');setSuccess(false);if(password!==confirmation){setError('As senhas não coincidem.');return;}if(password===current){setError('Escolha uma senha diferente da provisória ou atual.');return;}setBusy(true);try{await app.changePassword(current,password,confirmation);setCurrent('');setPassword('');setConfirmation('');setSuccess(true);}catch(error){setError(errorMessage(error));}finally{setBusy(false);}}
  return <Panel title={required?'Crie sua senha de acesso':'Minha conta'} subtitle={required?'Troca obrigatória antes de acessar o painel':'Altere a senha usada para entrar com e-mail'}><form className="account-password" onSubmit={submit} aria-busy={busy}><p>{app.user?.email}</p><p>Esta é a senha do sistema Cardiofitness. A senha do Gmail permanece independente.</p>{error&&<Notice message={error}/>} {success&&<Notice success message="Senha alterada com sucesso."/>}<Field label={required?'Senha provisória':'Senha atual'}><input type="password" autoComplete="current-password" required maxLength={256} disabled={busy||app.mode==='demo'} value={current} onChange={event=>setCurrent(event.target.value)}/></Field><Field label="Nova senha" hint="Use pelo menos 12 caracteres."><input type="password" autoComplete="new-password" required minLength={12} maxLength={72} disabled={busy||app.mode==='demo'} value={password} onChange={event=>setPassword(event.target.value)}/></Field><Field label="Confirmar nova senha"><input type="password" autoComplete="new-password" required minLength={12} maxLength={72} disabled={busy||app.mode==='demo'} value={confirmation} onChange={event=>setConfirmation(event.target.value)}/></Field><button className="button primary" disabled={busy||app.mode==='demo'}>{busy?<LoaderCircle size={18} className="spin"/>:<LockKeyhole size={18}/>} {required?'Salvar senha e continuar':'Alterar senha'}</button>{required&&<button type="button" className="button" disabled={busy} onClick={()=>void app.logout()}>Sair</button>}{app.mode==='demo'&&<p>Alteração de senha disponível somente para contas reais.</p>}</form></Panel>;
}

function Configuration({data,cycleId,setCycleId,onEdit,demo,googleConfigured}:{data:AppData;cycleId:string;setCycleId:(id:string)=>void;onEdit:(editor:Editor)=>void;demo:boolean;googleConfigured:boolean}) {
  const [tab,setTab]=useState<'cycles'|'forms'|'account'|'access'>('cycles');const [rosterId,setRosterId]=useState('');const evaluations=cycleEvaluations(data,cycleId);const selectedRoster=evaluations.find(e=>e.id===rosterId)||evaluations[0];
  return <><div className="settings-tabs" role="tablist" aria-label="Configurações"><button role="tab" aria-selected={tab==='cycles'} onClick={()=>setTab('cycles')}><CalendarDays size={18}/>Ciclos e participantes</button><button role="tab" aria-selected={tab==='forms'} onClick={()=>setTab('forms')}><ClipboardList size={18}/>Formulários de Avaliação</button><button role="tab" aria-selected={tab==='account'} onClick={()=>setTab('account')}><LockKeyhole size={18}/>Minha conta</button><button role="tab" aria-selected={tab==='access'} onClick={()=>setTab('access')}><UsersRound size={18}/>Acessos do RH</button></div>{tab==='access'?<RhAccess mode={demo?'demo':'live'}/>:tab==='account'?<PasswordSettings/>:tab==='cycles'?<Panel title="Ciclos de avaliação" subtitle="Crie o próximo mês automaticamente ou use o editor avançado" action={<div className="quick-actions"><button className="button primary" onClick={()=>onEdit({type:'quick-cycle'})}><Plus size={17}/>Criar próximo ciclo</button><button className="button" onClick={()=>onEdit({type:'cycle'})}>Avançado</button></div>}><div className="table-scroll"><table><thead><tr><th>Ciclo</th><th>Período</th><th>Participantes</th><th>Status</th><th>Ação</th></tr></thead><tbody>{[...data.cycles].sort((a,b)=>b.startDate.localeCompare(a.startDate)).map(cycle=><tr key={cycle.id}><td className="strong">{cycle.name}</td><td>{formatDate(cycle.startDate)} a {formatDate(cycle.endDate)}</td><td>{quantity(cycle.participants.length,'pessoa')}</td><td><Pill kind={cycleState(cycle)==='Em andamento'?'green':'muted'}>{cycleState(cycle)}</Pill></td><td><button className="button small" onClick={()=>onEdit({type:'cycle',item:cycle})}><Pencil size={15}/>Editar</button><button className="button small" onClick={()=>onEdit({type:'cycle',sourceCycleId:cycle.id})}>Preparar próximo</button></td></tr>)}</tbody></table></div>{!data.cycles.length&&<Empty title="Cadastre o primeiro ciclo">Defina o período e selecione as pessoas que participarão.</Empty>}<div className="settings-note"><ShieldCheck size={19}/><p>Os vínculos de liderança são preservados em cada ciclo. Ciclos que já receberam respostas mantêm suas datas e participantes.</p></div></Panel>:<><Panel title="Formulários do ciclo" subtitle="Configuração dos formulários do portal de avaliação" action={<div className="quick-actions"><button className="button primary" disabled={!cycleId} onClick={()=>onEdit({type:'native-evaluation'})}><Plus size={17}/>Nova avaliação nativa</button></div>}><div className="table-filters"><Field label="Ciclo de avaliação"><select value={cycleId} onChange={event=>setCycleId(event.target.value)}>{!data.cycles.length&&<option value="">Cadastre um ciclo primeiro</option>}{data.cycles.map(cycle=><option key={cycle.id} value={cycle.id}>{cycle.name}</option>)}</select></Field></div><div className="settings-form-list">{evaluations.map(evaluation=><div className="settings-form-row" key={evaluation.id}><span className="form-icon"><ClipboardList size={22}/></span><div><h3>{evaluation.name}</h3><p>{quantity(evaluation.mapping.scoreQuestions.length,'pergunta numérica','perguntas numéricas')} · {evaluation.expectedResponses===null?'Total esperado não definido':`${quantity(evaluation.expectedResponses,'resposta esperada','respostas esperadas')}`}</p><small>Portal Web Cardiofitness (Nativo)</small></div><Pill kind="green">Portal Web Ativo</Pill></div>)}</div>{!evaluations.length&&<Empty title="Nenhum formulário neste ciclo">Crie uma nova avaliação nativa para ativar os questionários no portal.</Empty>}</Panel><Panel title="Relação de participantes e opções dos formulários" subtitle="Confira a relação de colaboradores deste ciclo."><div className="padded"><label className="field"><span>Formulário a conferir</span><select value={selectedRoster?.id||''} onChange={e=>setRosterId(e.target.value)}>{evaluations.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label>{selectedRoster&&<FormRoster key={selectedRoster.id} evaluationId={selectedRoster.id}/>}</div></Panel></>}<div className="connection-note"><Database size={22}/><div><b>Origem dos dados e armazenamento</b><p>{demo ? 'Demonstração: somente dados fictícios locais.' : 'Portal Web Cardiofitness ativo. Avaliações registradas em tempo real com armazenamento seguro no banco de dados Supabase.'}</p></div><Pill kind={demo?'muted':'green'}>{demo?'Demo local':'Portal Nativo 100% Ativo'}</Pill></div></>;
}

function NativeEvaluationEditor({data,cycleId,onClose,onSaved}:{data:AppData;cycleId:string;onClose:()=>void;onSaved:()=>void}) {
  const {saveEvaluation}=useApp();
  const cycle=data.cycles.find(item=>item.id===cycleId);
  const [kind,setKind]=useState<EvaluationKind>('team');
  const [name,setName]=useState('Avaliação da equipe');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const existingNative=!!cycle&&data.evaluations.some(item=>item.cycleId===cycle.id&&item.sourceType==='native'&&item.kind===kind);
  function changeKind(value:EvaluationKind){
    setKind(value);
    setName(({leadership:'Avaliação de líderes',team:'Avaliação da equipe',self:'Autoavaliação',leader_to_employee:'Líder avalia colaborador'})[value]);
  }
  async function submit(event:FormEvent){
    event.preventDefault();
    if(!cycle){setError('Selecione um ciclo antes de criar a avaliação.');return;}
    if(existingNative){setError('Este ciclo já possui uma avaliação nativa deste tipo.');return;}
    setBusy(true);setError('');
    try{
      const participantIds=new Set(cycle.participants.map(item=>item.employeeId));
      const departments=data.employees.filter(employee=>employee.active&&participantIds.has(employee.id)).map(employee=>employee.department);
      const {mapping,questionSections}=nativeEvaluationMapping(kind,departments);
      const id=crypto.randomUUID();
      const draft:Evaluation={id,cycleId:cycle.id,name:name.trim(),kind,sourceType:'native',googleFormId:'',googleFormUrl:'',expectedResponses:null,mapping,questionSections,lastSyncedAt:null,syncMessage:null};
      const projected:AppData={...data,evaluations:[...data.evaluations,draft]};
      const expected=getParticipation(projected,cycle.id,id).reduce((total,row)=>total+row.expected,0);
      if(!mapping.scoreQuestions.length||expected<1)throw new Error('O ciclo precisa ter pessoas ativas com pelo menos uma avaliação prevista.');
      await saveEvaluation({...draft,expectedResponses:expected});
      onSaved();
    }catch(failure){setError(failure instanceof Error?failure.message:'Não foi possível criar a avaliação.');}
    finally{setBusy(false);}
  }
  return <Modal title="Criar avaliação nativa" subtitle="As respostas serão gravadas no ciclo e aparecerão nos resultados do RH." onClose={onClose}>
    <form onSubmit={submit}>
      <div className="modal-body">
        {error&&<Notice message={error}/>}
        {!cycle&&<Notice message="Cadastre ou selecione um ciclo primeiro."/>}
        {cycle&&<div className="info-banner compact"><ClipboardList size={19}/><p>Ciclo: <b>{cycle.name}</b> · {quantity(cycle.participants.length,'participante')}</p></div>}
        <Field label="Tipo de avaliação">
          <select value={kind} onChange={event=>changeKind(event.target.value as EvaluationKind)}>
            <option value="team">Equipe e autoavaliação</option>
            <option value="leadership">Colaborador avalia liderança</option>
            <option value="leader_to_employee">Liderança avalia colaborador</option>
            <option value="self">Autoavaliação</option>
          </select>
        </Field>
        <Field label="Nome exibido no questionário"><input required maxLength={140} value={name} onChange={event=>setName(event.target.value)}/></Field>
        <div className="settings-note"><ShieldCheck size={19}/><p>O link público é <b>/avaliar</b>. Não exige conta das pessoas; somente o RH entra no painel. Cada par pessoa-avaliada/respondente pode ser registrado uma vez neste ciclo.</p></div>
        {existingNative&&<Notice message="Este ciclo já possui uma avaliação nativa deste tipo."/>}
      </div>
      <div className="modal-actions"><button type="button" className="button" onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy||!cycle||existingNative}>{busy&&<LoaderCircle className="spin" size={17}/>}Criar e ativar</button></div>
    </form>
  </Modal>;
}

function EmployeeEditor({data,employee,onClose,onSaved}:{data:AppData;employee?:Employee;onClose:()=>void;onSaved:(name:string)=>void}) {
  const {saveEmployee}=useApp();const [form,setForm]=useState<EmployeeInput>(employee?employeeInput(employee):{name:'',email:'',formName:'',department:'',leaderId:null,isLeader:false,active:true});const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  function update<K extends keyof EmployeeInput>(key:K,value:EmployeeInput[K]){setForm(current=>({...current,[key]:value}));}
  async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError('');try{const saved=await saveEmployee({...form,name:form.name.trim(),formName:form.formName.trim(),email:form.email.trim(),department:form.department.trim()},employee?.id);onSaved(saved.name);}catch(error){setError(errorMessage(error));}finally{setBusy(false);}}
  return <Modal title={employee?'Editar colaborador':'Adicionar colaborador'} subtitle="Dados de cadastro e vínculo com a liderança." onClose={onClose}><form onSubmit={submit}><div className="modal-body">{error&&<Notice message={error}/>}<Field label="Nome completo *"><input required maxLength={140} value={form.name} onChange={event=>{const name=event.target.value;setForm(current=>({...current,name,formName:current.formName===current.name?name:current.formName}));}}/></Field><Field label="Nome de identificação *" hint="Nome oficial para identificação nos formulários de avaliação."><input required maxLength={140} value={form.formName} onChange={event=>update('formName',event.target.value)}/></Field><Field label="E-mail de identificação" hint="Opcional quando a identificação do formulário é feita pelo nome."><input type="email" maxLength={254} value={form.email} onChange={event=>update('email',event.target.value)}/></Field><div className="form-grid"><Field label="Setor *"><input required maxLength={100} list="departments" value={form.department} onChange={event=>update('department',event.target.value)}/><datalist id="departments">{Array.from(new Set(data.employees.map(employee=>employee.department))).map(department=><option key={department} value={department}/>)}</datalist></Field><Field label="Liderança responsável"><select value={form.leaderId||''} onChange={event=>update('leaderId',event.target.value||null)}><option value="">Sem vínculo</option>{data.employees.filter(item=>item.isLeader&&item.active&&item.id!==employee?.id).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></Field></div><div className="form-grid"><Field label="Status"><select value={form.active?'active':'inactive'} onChange={event=>update('active',event.target.value==='active')}><option value="active">Ativo</option><option value="inactive">Inativo</option></select></Field><label className="checkbox-label"><input type="checkbox" checked={form.isLeader} onChange={event=>update('isLeader',event.target.checked)}/>Esta pessoa exerce liderança</label></div></div><div className="modal-actions"><small>* Campos obrigatórios</small><button type="button" className="button" onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy}>{busy&&<LoaderCircle className="spin" size={17}/>}Salvar cadastro</button></div></form></Modal>;
}
function Deactivate({employee,onClose,onSaved}:{employee:Employee;onClose:()=>void;onSaved:()=>void}) {
  const {saveEmployee}=useApp();const [busy,setBusy]=useState(false),[error,setError]=useState('');async function save(){setBusy(true);try{await saveEmployee({...employeeInput(employee),active:false},employee.id);onSaved();}catch(error){setError(errorMessage(error));}finally{setBusy(false);}}
  return <Modal title={`Desativar ${employee.name}?`} onClose={onClose}><div className="modal-body">{error&&<Notice message={error}/>}<p className="modal-intro">A pessoa ficará inativa no cadastro. As avaliações e os resultados anteriores serão preservados.</p><div className="deactivate-person"><Avatar name={employee.name}/><div><b>{employee.name}</b><small>{employee.department}</small></div></div></div><div className="modal-actions"><button type="button" className="button" onClick={onClose}>Cancelar</button><button className="button danger" onClick={()=>void save()} disabled={busy}>{busy?<LoaderCircle className="spin" size={17}/>:<CircleOff size={17}/>}Desativar colaborador</button></div></Modal>;
}

function DeleteEmployeeModal({data,employee,onClose,onDeleted,onDeactivated}:{data:AppData;employee:Employee;onClose:()=>void;onDeleted:()=>void;onDeactivated:()=>void}) {
  const {saveEmployee,deleteEmployee}=useApp();
  const [busy,setBusy]=useState<'deactivate'|'delete'|null>(null);
  const [error,setError]=useState('');
  const hasResponses = data.responses.some(r => r.respondentId === employee.id || r.subjectId === employee.id);
  const activeSubordinates = data.employees.filter(e => e.active && e.leaderId === employee.id);

  async function handleDeactivate() {
    setBusy('deactivate');
    setError('');
    try {
      await saveEmployee({...employeeInput(employee), active: false}, employee.id);
      onDeactivated();
    } catch(err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    setBusy('delete');
    setError('');
    try {
      await deleteEmployee(employee.id);
      onDeleted();
    } catch(err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal title={`Remover colaborador: ${employee.name}`} onClose={onClose}>
      <div className="modal-body">
        {error && <Notice message={error}/>}
        <div className="deactivate-person" style={{marginBottom:16}}>
          <Avatar name={employee.name}/>
          <div>
            <b>{employee.name}</b>
            <small>{employee.department} {employee.isLeader ? '· Líder' : ''}</small>
          </div>
        </div>

        {hasResponses ? (
          <div className="notice" style={{background:'#fef6ee',borderColor:'#f9dbaf',color:'#93370d',display:'block',padding:'12px 14px',borderRadius:6}}>
            <p style={{margin:0,fontWeight:600,fontSize:14}}>⚠️ Colaborador com avaliações no histórico</p>
            <p style={{margin:'6px 0 0',fontSize:13,lineHeight:1.5}}>
              Este colaborador possui respostas registradas no sistema. Excluí-lo permanentemente removeria dados de médias e relatórios de ciclos anteriores.
              Para preservar a integridade histórica, <b>desative o colaborador</b>. Ele não receberá novas avaliações, mas seu histórico permanecerá seguro.
            </p>
          </div>
        ) : activeSubordinates.length > 0 ? (
          <div className="notice" style={{background:'#fef6ee',borderColor:'#f9dbaf',color:'#93370d',display:'block',padding:'12px 14px',borderRadius:6}}>
            <p style={{margin:0,fontWeight:600,fontSize:14}}>⚠️ Liderança com subordinados vinculados</p>
            <p style={{margin:'6px 0 0',fontSize:13,lineHeight:1.5}}>
              Existem {activeSubordinates.length} colaboradores ativos vinculados a esta liderança ({activeSubordinates.map(s => s.name.split(' ')[0]).join(', ')}). Altere a liderança desses colaboradores antes de remover.
            </p>
          </div>
        ) : (
          <p className="modal-intro" style={{fontSize:13,lineHeight:1.5}}>
            Este colaborador <b>não possui avaliações no histórico</b>. Você pode desativá-lo (recomendado) ou excluí-lo permanentemente do cadastro.
          </p>
        )}
      </div>

      <div className="modal-actions" style={{justifyContent:'flex-end',gap:8}}>
        <button type="button" className="button" onClick={onClose} disabled={busy !== null}>
          Cancelar
        </button>
        {employee.active && (
          <button
            type="button"
            className="button"
            style={{color:'#b42318',borderColor:'#fda29b'}}
            onClick={() => void handleDeactivate()}
            disabled={busy !== null}
          >
            {busy === 'deactivate' ? <LoaderCircle className="spin" size={16}/> : <CircleOff size={16}/>}
            {hasResponses ? 'Desativar colaborador (Recomendado)' : 'Apenas desativar'}
          </button>
        )}
        {!hasResponses && activeSubordinates.length === 0 && (
          <button
            type="button"
            className="button danger"
            onClick={() => void handleDelete()}
            disabled={busy !== null}
          >
            {busy === 'delete' ? <LoaderCircle className="spin" size={16}/> : <Trash2 size={16}/>}
            Excluir permanentemente
          </button>
        )}
      </div>
    </Modal>
  );
}

function CycleEditor({data,cycle,sourceCycleId,onClose,onSaved}:{data:AppData;cycle?:Cycle;sourceCycleId?:string;onClose:()=>void;onSaved:(id:string)=>void}) {
  const {saveCycle,prepareCycle}=useApp();const reference=data.cycles.find(c=>c.id===sourceCycleId);const following=reference?new Date(reference.endDate+'T12:00:00Z'):null;if(following)following.setUTCDate(following.getUTCDate()+1);const start=following?.toISOString().slice(0,10)||'';const [form,setForm]=useState<CycleInput>(cycle?cycleInput(cycle):reference?{name:'',startDate:start,endDate:bimonthlyEnd(start),participants:reference.participants.filter(p=>data.employees.some(e=>e.id===p.employeeId&&e.active)).map(p=>({employeeId:p.employeeId,leaderId:data.employees.find(e=>e.id===p.employeeId)?.leaderId||null}))}:{name:'',startDate:'',endDate:'',participants:[]}),[search,setSearch]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);const locked=!!cycle&&cycleResponses(data,cycle.id).length>0;const employees=data.employees.filter(employee=>(employee.active||form.participants.some(participant=>participant.employeeId===employee.id))&&`${employee.name} ${employee.department}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  function toggle(employee:Employee){setForm(current=>({...current,participants:current.participants.some(item=>item.employeeId===employee.id)?current.participants.filter(item=>item.employeeId!==employee.id):[...current.participants,{employeeId:employee.id,leaderId:employee.leaderId}]}));}
  function adjustDays(days:number){setForm(current=>{const base=current.endDate?new Date(current.endDate+'T12:00:00Z'):new Date();base.setUTCDate(base.getUTCDate()+days);const newEnd=base.toISOString().slice(0,10);return {...current,endDate:newEnd<current.startDate?current.startDate:newEnd};});}
  async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError('');try{const saved=sourceCycleId?await prepareCycle(form,sourceCycleId):await saveCycle(form,cycle?.id);onSaved(saved.id);}catch(error){setError(errorMessage(error));}finally{setBusy(false);}}
  return <Modal wide title={cycle?'Editar ciclo':reference?'Preparar próximo ciclo':'Novo ciclo de avaliação'} subtitle="Período do ciclo livre para edição pelo RH, participantes e vínculos de liderança." onClose={onClose}><form onSubmit={submit}><div className="modal-body">{error&&<Notice message={error}/>}{reference&&<div className="info-banner compact"><ClipboardList size={19}/><p>Referência: <b>{reference.name}</b>. Confira datas, participantes e vínculos. Os formulários e o mapeamento serão copiados; respostas e histórico não serão copiados.</p></div>}<Field label="Nome do ciclo *"><input required maxLength={100} value={form.name} onChange={event=>setForm(current=>({...current,name:event.target.value}))} placeholder="Novembro - Dezembro / 2026"/></Field><div className="form-grid"><Field label="Início *"><input type="date" required value={form.startDate} onChange={event=>{const startDate=event.target.value;setForm(current=>({...current,startDate,endDate:current.endDate&&current.endDate>=startDate?current.endDate:startDate}));}}/></Field><Field label="Encerramento *" hint="O RH pode ajustar ou prorrogar o ciclo livremente."><input type="date" required min={form.startDate} value={form.endDate} onChange={event=>setForm(current=>({...current,endDate:event.target.value}))}/><div style={{display:'flex',gap:6,marginTop:6,flexWrap:'wrap'}}><button type="button" className="button small" onClick={()=>adjustDays(7)}>+7 dias</button><button type="button" className="button small" onClick={()=>adjustDays(15)}>+15 dias</button><button type="button" className="button small" onClick={()=>adjustDays(30)}>+30 dias</button><button type="button" className="button small" onClick={()=>adjustDays(-7)}>-7 dias</button></div></Field></div>{locked&&<div className="info-banner compact"><ShieldCheck size={19}/><p>Este ciclo já possui respostas registradas. O período pode ser ajustado ou prorrogado pelo RH a qualquer momento.</p></div>}<div className="participant-heading"><h3>Participantes <span>{quantity(form.participants.length,'selecionado')}</span></h3><button type="button" className="text-button" disabled={locked} onClick={()=>setForm(current=>({...current,participants:data.employees.filter(employee=>employee.active).map(employee=>({employeeId:employee.id,leaderId:employee.leaderId}))}))}>Selecionar todos os ativos</button></div><label className="search-field"><Search size={17}/><span className="sr-only">Buscar participantes</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar nome ou setor"/></label><div className="participant-list">{employees.map(employee=>{const item=form.participants.find(item=>item.employeeId===employee.id);return <div className="participant-row" key={employee.id}><label className="checkbox-label"><input type="checkbox" disabled={locked} checked={!!item} onChange={()=>toggle(employee)}/><span><b>{employee.name}</b><small>{employee.department}</small></span></label><select aria-label={`Liderança de ${employee.name} neste ciclo`} disabled={locked||!item} value={item?.leaderId||''} onChange={event=>setForm(current=>({...current,participants:current.participants.map(participant=>participant.employeeId===employee.id?{...participant,leaderId:event.target.value||null}:participant)}))}><option value="">Sem vínculo de liderança</option>{data.employees.filter(leader=>leader.isLeader&&(leader.active||leader.id===item?.leaderId)&&leader.id!==employee.id).map(leader=><option value={leader.id} key={leader.id}>{leader.name}</option>)}</select></div>;})}{!employees.length&&<p className="muted padded">Nenhum colaborador disponível para este filtro.</p>}</div><small className="form-hint">O vínculo selecionado fica registrado neste ciclo, mesmo que o cadastro seja alterado depois.</small></div><div className="modal-actions"><small>* Campos obrigatórios</small><button type="button" className="button" onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy}>{busy&&<LoaderCircle className="spin" size={17}/>}Salvar ciclo</button></div></form></Modal>;
}

function EvaluationEditor({data,cycleId,evaluation,preset,onClose,onSaved}:{data:AppData;cycleId:string;evaluation?:Evaluation;preset?:typeof PROVIDED_FORMS[number];onClose:()=>void;onSaved:()=>void}) {
  const {saveEvaluation,inspectForm,mode,googleConfigured}=useApp();const [form,setForm]=useState<EvaluationInput>(evaluation?evaluationInput(evaluation):{cycleId,name:preset?.name||'',kind:preset?.kind||'leadership',googleFormId:preset?.googleFormId||'',googleFormUrl:preset?.url||'',expectedResponses:null,mapping:preset?.mapping||{respondentQuestionIds:[],subjectQuestionIds:[],departmentQuestionIds:[],scoreQuestions:[]}}),[metadata,setMetadata]=useState<FormMetadata|null>(null),[error,setError]=useState(''),[reading,setReading]=useState(false),[busy,setBusy]=useState(false);const locked=!!evaluation&&data.responses.some(response=>response.evaluationId===evaluation.id);const canRead=mode==='demo'?!!evaluation:googleConfigured;
  function update<K extends keyof EvaluationInput>(key:K,value:EvaluationInput[K]){setForm(current=>({...current,[key]:value}));}
  function changeLink(value:string){
    update('googleFormUrl',value);setError('');
    try{const resolved=resolveFormLink(value);let unchanged=false;try{unchanged=resolveFormLink(form.googleFormUrl).url===resolved.url;}catch{}
      if(unchanged)return;setMetadata(null);setForm(current=>({...current,googleFormUrl:value,googleFormId:resolved.googleFormId,mapping:resolved.preset?.mapping||{respondentQuestionIds:[],subjectQuestionIds:[],departmentQuestionIds:[],scoreQuestions:[]},...(!evaluation&&resolved.preset?{name:resolved.preset.name,kind:resolved.preset.kind}:{})}));
    }catch{}
  }
  function changeId(value:string){setMetadata(null);setForm(current=>{let same=false;try{same=resolveFormId(value)===resolveFormId(current.googleFormId);}catch{}return {...current,googleFormId:value,mapping:same?current.mapping:{respondentQuestionIds:[],subjectQuestionIds:[],departmentQuestionIds:[],scoreQuestions:[]}};});}
  async function read(){setReading(true);setError('');try{const id=mode==='demo'?form.googleFormId.trim():resolveFormId(form.googleFormId);update('googleFormId',id);const result=await inspectForm(id);if(mode!=='demo'&&result.responderUri&&!locked)update('googleFormUrl',resolveFormLink(result.responderUri).url);setMetadata(result);}catch(error){setError(errorMessage(error));}finally{setReading(false);}}
  function map(field:'respondentQuestionIds'|'subjectQuestionIds'|'departmentQuestionIds',id:string){setForm(current=>({...current,mapping:{...current.mapping,[field]:current.mapping[field].includes(id)?current.mapping[field].filter(value=>value!==id):[...current.mapping[field],id]}}));}
  function score(id:string){const question=metadata?.questions.find(question=>question.id===id);if(!question)return;setForm(current=>({...current,mapping:{...current.mapping,scoreQuestions:current.mapping.scoreQuestions.some(item=>item.id===id)?current.mapping.scoreQuestions.filter(item=>item.id!==id):[...current.mapping.scoreQuestions,{id:question.id,title:question.title,min:question.min,max:question.max}]}}));}
  async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError('');try{const resolved=mode==='demo'?null:resolveFormLink(form.googleFormUrl);const id=mode==='demo'?form.googleFormId.trim():resolveFormId(form.googleFormId)||resolved?.googleFormId||'';if(resolved?.googleFormId&&id&&resolved.googleFormId!==id)throw new Error('O link e o ID pertencem a formulários diferentes. Confira o vínculo antes de salvar.');await saveEvaluation({...form,name:form.name.trim(),googleFormId:id,googleFormUrl:resolved?.url||form.googleFormUrl.trim()},evaluation?.id);onSaved();}catch(error){setError(errorMessage(error));}finally{setBusy(false);}}
  return <Modal wide title={evaluation?'Configurar formulário':'Vincular formulário ao ciclo'} subtitle="Cole o link do formulário usado neste ciclo. Os formulários já conferidos são reconhecidos automaticamente." onClose={onClose}><form onSubmit={submit}><div className="modal-body">{error&&<Notice message={error}/>}<Field label="Nome da avaliação *"><input required maxLength={140} value={form.name} onChange={event=>update('name',event.target.value)}/></Field><div className="form-grid"><Field label="Ciclo *"><select disabled={locked} value={form.cycleId} required onChange={event=>update('cycleId',event.target.value)}>{data.cycles.map(cycle=><option key={cycle.id} value={cycle.id}>{cycle.name}</option>)}</select></Field><Field label="Tipo de avaliação"><select disabled={locked} value={form.kind} onChange={event=>update('kind',event.target.value as EvaluationKind)}><option value="leadership">Colaborador → Líder</option><option value="team">Equipe e autoavaliação</option><option value="self">Autoavaliação</option><option value="leader_to_employee">Líder → Colaborador</option></select></Field></div><Field label="Link do formulário deste ciclo *" hint="Cole o link de preenchimento ou de edição. Para os dois formulários conferidos, o ID e o mapeamento são preenchidos automaticamente."><input type="url" required disabled={locked} value={form.googleFormUrl} onChange={event=>changeLink(event.target.value)} placeholder="https://cardiofitness-smoky.vercel.app/avaliar"/></Field><Field label="ID de edição do formulário (Google Forms API)" hint="Para outro formulário, cole aqui o link de edição ou o ID em forms/d/ID/edit. Um link público desconhecido não informa esse ID."><input disabled={locked} value={form.googleFormId} onChange={event=>changeId(event.target.value)} placeholder="Cole o link de edição ou o ID do formulário"/></Field><div className="form-grid"><Field label="Quantidade de respostas esperadas" hint="Opcional. Deve considerar cada resposta prevista, inclusive entre colegas."><input type="number" min="1" max="1000000" step="1" value={form.expectedResponses??''} onChange={event=>update('expectedResponses',event.target.value?Number(event.target.value):null)} placeholder="Não definido"/></Field><div className="read-questions"><button type="button" className="button" disabled={!form.googleFormId.trim()||!canRead||reading} onClick={()=>void read()}>{reading?<LoaderCircle className="spin" size={17}/>:<RefreshCw size={17}/>}Ler perguntas</button><small>{!googleConfigured?'Disponível após vincular as credenciais no servidor.':'Consulta as perguntas pelo ID de edição.'}</small></div></div>{locked&&<div className="info-banner compact"><ShieldCheck size={19}/><p>Já existem respostas neste formulário. O tipo, o ciclo e o mapeamento estão preservados.</p></div>}<div className="mapping-head"><h3>Mapeamento das respostas</h3><p>Selecione as perguntas de identificação de cada seção condicional. As respostas de texto são importadas automaticamente, sem mapeamento adicional, e aparecem nos resultados identificados. Não marque perguntas de feedback como identificação.</p></div>{metadata?<><div className="metadata-title"><ClipboardList size={19}/><b>{metadata.title}</b><Pill kind="muted">{quantity(metadata.questions.length,'pergunta')}</Pill></div>{metadata.collectsEmail&&<p className="form-hint">O formulário coleta e-mail. Se nenhuma pergunta de respondente for marcada, a identificação pode usar o e-mail cadastrado.</p>}<div className="mapping-identification">{(['respondentQuestionIds','subjectQuestionIds','departmentQuestionIds'] as const).map((field,index)=><fieldset key={field} disabled={locked}><legend>{['Respondente','Pessoa avaliada','Setor (opcional)'][index]}</legend>{metadata.questions.filter(question=>!question.numeric).map(question=><label className="mapping-option" key={question.id}><input type="checkbox" checked={form.mapping[field].includes(question.id)} onChange={()=>map(field,question.id)}/><span>{question.title}<small>{question.section||'Identificação inicial'}</small></span></label>)}{!metadata.questions.some(question=>!question.numeric)&&<p className="muted">Nenhuma pergunta de identificação.</p>}</fieldset>)}</div><fieldset className="mapping-scores" disabled={locked}><legend>Perguntas com notas</legend>{metadata.questions.filter(question=>question.numeric).map(question=><label className="mapping-option" key={question.id}><input type="checkbox" checked={form.mapping.scoreQuestions.some(item=>item.id===question.id)} onChange={()=>score(question.id)}/><span>{question.title}<small>{question.section||'Identificação inicial'}</small></span><Pill kind="muted">{question.min} a {question.max}</Pill></label>)}</fieldset></>:form.mapping.scoreQuestions.length?<div className="mapping-existing"><p><b>{quantity(form.mapping.scoreQuestions.length,'pergunta numérica configurada','perguntas numéricas configuradas')}</b> · Escala {form.mapping.scoreQuestions[0].min} a {form.mapping.scoreQuestions[0].max}</p><div>{form.mapping.scoreQuestions.map(question=><span key={question.id}><Check size={14}/>{question.title}</span>)}</div><small>Use “Ler perguntas” para consultar o mapeamento de identificação.</small></div>:<div className="mapping-empty">O mapeamento ficará disponível após ler as perguntas. Você pode salvar o vínculo agora e completar depois.</div>}{form.kind==='team'&&<div className="settings-note"><UsersRound size={19}/><p>Quando respondente e pessoa avaliada são a mesma pessoa, a resposta é classificada como autoavaliação. As demais respostas são avaliações entre colegas.</p></div>}</div><div className="modal-actions"><small>* Campos obrigatórios</small><button type="button" className="button" onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy}>{busy&&<LoaderCircle className="spin" size={17}/>}Salvar configuração</button></div></form></Modal>;
}






