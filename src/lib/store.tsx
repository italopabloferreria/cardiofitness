'use client';
import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import type { AppData, Bootstrap, Cycle, CycleInput, Employee, EmployeeInput, Evaluation, EvaluationInput, FormMetadata, SyncResult } from './types';
import { createDemoData } from './demo';

const EMPTY: AppData = {employees:[],cycles:[],evaluations:[],responses:[]};
const DEMO_KEY = 'cardiofitness-demo-v1';
interface AppContext {
  status: 'loading'|'login'|'setup'|'ready'|'password'; mode:'demo'|'live'; user: Bootstrap['user']|null;
  data:AppData; googleConfigured:boolean; error:string|null;
  login:(email:string,password:string)=>Promise<void>; logout:()=>Promise<void>;
  changePassword:(currentPassword:string,newPassword:string,confirmation:string)=>Promise<void>;
  saveEmployee:(input:EmployeeInput,id?:string)=>Promise<Employee>;
  saveCycle:(input:CycleInput,id?:string)=>Promise<Cycle>;
  saveEvaluation:(input:EvaluationInput,id?:string)=>Promise<Evaluation>;
  syncEvaluation:(id:string)=>Promise<SyncResult>; inspectForm:(formId:string)=>Promise<FormMetadata>; resetDemo:()=>void;
}
const Context=createContext<AppContext|null>(null);
async function request<T>(url:string, options:RequestInit={}):Promise<T> {
  const response=await fetch(url,{...options,cache:'no-store',headers:{'Content-Type':'application/json',...options.headers}});
  const body=await response.json().catch(()=>({error:'O servidor não respondeu como esperado.'}));
  if(!response.ok) throw Object.assign(new Error(typeof body.error==='string'?body.error:'Não foi possível concluir a operação.'),{status:response.status});
  return body as T;
}
export function AppProvider({children}:{children:ReactNode}) {
  const [status,setStatus]=useState<AppContext['status']>('loading');
  const [mode,setMode]=useState<'demo'|'live'>('live'); const [user,setUser]=useState<Bootstrap['user']|null>(null);
  const [data,setData]=useState<AppData>(EMPTY); const [googleConfigured,setGoogleConfigured]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const foregroundRequests=useRef(0); const dataRevision=useRef(0);
  const boot=useCallback(async()=>{
    try {
      const recovering=new URLSearchParams(window.location.search).get('recovery')==='1';
      const boot=await request<Bootstrap>('/api/bootstrap');
      setMode(boot.mode);setUser(boot.user);setGoogleConfigured(boot.googleConfigured);setError(null);
      let initial=boot.data;
      if(boot.mode==='demo') {
        try { const stored=localStorage.getItem(DEMO_KEY); if(stored) { const parsed=JSON.parse(stored); if(parsed && ['employees','cycles','evaluations','responses'].every(key=>Array.isArray(parsed[key]))) initial=parsed; } } catch { /* A corrupt local demo never replaces server data. */ }
      }
      if(recovering){setData(EMPTY);setUser(null);setGoogleConfigured(false);setStatus('login');}
      else {setData(initial);setStatus('ready');}
    } catch(error) {
      const e=error as Error&{status?:number};setError(e.status===401?null:e.message);setData(EMPTY);setUser(null);setGoogleConfigured(false);setStatus(e.status===428?(new URLSearchParams(window.location.search).get('recovery')==='1'?'login':'password'):e.status===401||e.status===403?'login':'setup');
    }
  },[]);
  async function authorizedRequest<T>(url:string,options:RequestInit={}):Promise<T> {
    foregroundRequests.current++;dataRevision.current++;
    try { return await request<T>(url,options); }
    catch(error) {
      if([401,403,428].includes((error as {status?:number}).status??0)) {
        setData(EMPTY);setUser(null);setGoogleConfigured(false);setError(null);setStatus('loading');
        await boot();
      }
      throw error;
    } finally {foregroundRequests.current--;dataRevision.current++;}
  }
  useEffect(()=>{void boot();},[boot]);
  useEffect(()=>{
    if(status!=='ready'||mode!=='live'||!user)return;
    let disposed=false;let refreshing=false;let controller:AbortController|undefined;
    const refresh=async()=>{
      if(disposed||refreshing||document.visibilityState!=='visible'||foregroundRequests.current)return;
      refreshing=true;const revision=dataRevision.current;controller=new AbortController();
      try {
        const updated=await request<Bootstrap>('/api/bootstrap',{signal:controller.signal});
        // A response fetched before a save or manual sync must never replace its newer result.
        if(disposed||foregroundRequests.current||revision!==dataRevision.current)return;
        if(updated.mode!=='live')return;
        setData(updated.data);setUser(updated.user);setGoogleConfigured(updated.googleConfigured);setError(null);
      } catch(error) {
        if(disposed||foregroundRequests.current||revision!==dataRevision.current)return;
        if([401,403,428].includes((error as {status?:number}).status??0))await boot();
        else setError('Não foi possível atualizar o painel automaticamente. Os últimos dados foram preservados.');
      } finally {refreshing=false;}
    };
    const interval=window.setInterval(()=>{void refresh();},30_000);
    const onVisibility=()=>{if(document.visibilityState==='visible')void refresh();};
    document.addEventListener('visibilitychange',onVisibility);
    return ()=>{disposed=true;controller?.abort();window.clearInterval(interval);document.removeEventListener('visibilitychange',onVisibility);};
  },[status,mode,user?.email,boot]);
  useEffect(()=>{if(status==='ready'&&mode==='demo') {try{localStorage.setItem(DEMO_KEY,JSON.stringify(data));}catch{setError('Não foi possível salvar a demonstração neste navegador. Verifique o espaço disponível.');}}},[data,mode,status]);
  const login=async(email:string,password:string)=>{if(mode!=='demo')await request('/api/auth/login',{method:'POST',body:JSON.stringify({email,password})});await boot();};
  const logout=async()=>{if(mode!=='demo')await authorizedRequest('/api/auth/logout',{method:'POST'});setStatus('login');setUser(null);setData(EMPTY);setError(null);setGoogleConfigured(false);};
  const changePassword=async(currentPassword:string,newPassword:string,confirmation:string)=>{await authorizedRequest('/api/auth/password',{method:'POST',body:JSON.stringify({currentPassword,newPassword,confirmation})});await boot();};
  const saveEmployee=async(input:EmployeeInput,id?:string)=>{
    if(!input.name.trim()||!input.formName.trim()||!input.department.trim()) throw new Error('Informe nome, nome no formulário e setor.');
    if(input.leaderId===id) throw new Error('Uma pessoa não pode ser sua própria liderança.');
    if(input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))throw new Error('Informe um e-mail válido ou deixe o campo vazio.');
    if(input.email&&data.employees.some(employee=>employee.id!==id&&employee.email.toLowerCase()===input.email.toLowerCase()))throw new Error('Este e-mail já está cadastrado.');
    if(input.leaderId&&!data.employees.some(employee=>employee.id===input.leaderId&&employee.active&&employee.isLeader))throw new Error('Selecione uma liderança ativa.');
    if(id&&(!input.active||!input.isLeader)&&data.employees.some(employee=>employee.leaderId===id&&employee.active))throw new Error('Atualize os vínculos dos colaboradores antes de desativar esta liderança.');
    const saved=mode==='demo'?{...input,id:id??crypto.randomUUID()}:await authorizedRequest<Employee>(`/api/employees${id?`/${id}`:''}`,{method:id?'PATCH':'POST',body:JSON.stringify(input)});
    setData(current=>({...current,employees:id?current.employees.map(employee=>employee.id===id?saved:employee):[...current.employees,saved]}));return saved;
  };
  const saveCycle=async(input:CycleInput,id?:string)=>{
    if(!input.name.trim()||!input.startDate||!input.endDate||input.startDate>input.endDate)throw new Error('Informe nome e um período válido para o ciclo.');
    if(!input.participants.length)throw new Error('Selecione ao menos um participante.');
    const old=data.cycles.find(cycle=>cycle.id===id);
    if(old&&data.responses.some(response=>data.evaluations.some(evaluation=>evaluation.id===response.evaluationId&&evaluation.cycleId===id))&&(old.startDate!==input.startDate||old.endDate!==input.endDate||JSON.stringify(old.participants)!==JSON.stringify(input.participants)))throw new Error('O ciclo já tem respostas. Preserve datas e participantes e crie um novo ciclo.');
    const saved=mode==='demo'?{...input,id:id??crypto.randomUUID()}:await authorizedRequest<Cycle>(`/api/cycles${id?`/${id}`:''}`,{method:id?'PATCH':'POST',body:JSON.stringify(input)});
    setData(current=>({...current,cycles:id?current.cycles.map(cycle=>cycle.id===id?saved:cycle):[...current.cycles,saved]}));return saved;
  };
  const saveEvaluation=async(input:EvaluationInput,id?:string)=>{
    if(!input.name.trim()||!input.cycleId)throw new Error('Informe nome e ciclo da avaliação.');
    if(input.mapping.scoreQuestions.length && input.mapping.scoreQuestions.some(q=>q.min!==input.mapping.scoreQuestions[0].min||q.max!==input.mapping.scoreQuestions[0].max))throw new Error('As perguntas selecionadas precisam usar a mesma escala.');
    if(input.expectedResponses!=null&&(!Number.isInteger(input.expectedResponses)||input.expectedResponses<1))throw new Error('Informe uma quantidade esperada maior que zero ou deixe em branco.');
    const old=data.evaluations.find(evaluation=>evaluation.id===id);
    if(old&&data.responses.some(response=>response.evaluationId===id)&&(old.kind!==input.kind||old.cycleId!==input.cycleId||old.googleFormId!==input.googleFormId||JSON.stringify(old.mapping)!==JSON.stringify(input.mapping)))throw new Error('A avaliação já tem respostas. Preserve o vínculo e o mapeamento ou configure uma nova avaliação.');
    const saved=mode==='demo'?{...input,id:id??crypto.randomUUID(),lastSyncedAt:old?.lastSyncedAt??null,syncMessage:old?.syncMessage??null}:await authorizedRequest<Evaluation>(`/api/evaluations${id?`/${id}`:''}`,{method:id?'PATCH':'POST',body:JSON.stringify(input)});
    setData(current=>({...current,evaluations:id?current.evaluations.map(evaluation=>evaluation.id===id?saved:evaluation):[...current.evaluations,saved]}));return saved;
  };
  const syncEvaluation=async(id:string)=>{
    if(mode==='demo')throw new Error('A demonstração usa dados fictícios. A sincronização real ficará disponível após conectar Google e Supabase.');
    const result=await authorizedRequest<SyncResult>(`/api/evaluations/${id}/sync`,{method:'POST'});
    setData(current=>({...current,evaluations:current.evaluations.map(evaluation=>evaluation.id===id?result.evaluation:evaluation),responses:[...current.responses.filter(response=>response.evaluationId!==id),...result.responses]}));return result;
  };
  const inspectForm=async(formId:string)=>{
    if(mode==='demo') {
      const evaluation=data.evaluations.find(item=>item.googleFormId===formId);
      if(!evaluation)throw new Error('A leitura real de perguntas requer a conexão com o Google. Nesta demonstração, use um formulário de exemplo já vinculado.');
      return {id:formId,title:evaluation.name,responderUri:evaluation.googleFormUrl,collectsEmail:false,questions:[{id:'demo-respondent',title:'Qual o seu nome?',numeric:false,section:'Identificação',min:0,max:0},{id:'demo-subject',title:'Quem você irá avaliar?',numeric:false,section:'Identificação',min:0,max:0},{id:'demo-department',title:'Qual o seu setor?',numeric:false,section:'Identificação',min:0,max:0},...evaluation.mapping.scoreQuestions.map(question=>({...question,numeric:true,section:'Avaliação'}))]};
    }
    return authorizedRequest<FormMetadata>(`/api/google/forms/inspect?formId=${encodeURIComponent(formId)}`);
  };
  const resetDemo=()=>{if(mode!=='demo')return;setData(createDemoData());};
  return <Context.Provider value={{status,mode,user,data,googleConfigured,error,login,logout,changePassword,saveEmployee,saveCycle,saveEvaluation,syncEvaluation,inspectForm,resetDemo}}>{children}</Context.Provider>;
}
export function useApp(){const context=useContext(Context);if(!context)throw new Error('AppProvider ausente');return context;}
