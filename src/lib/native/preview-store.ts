'use client';

import { useEffect, useState } from 'react';
import { NativeSchedule, NativePerson } from './campaign';
import { NativeCampaign, runNativeCycles, validateNativeSubmission } from './engine';

export type PreviewPerson = NativePerson & { name: string };
export interface PreviewSubmission { id: string; campaignId: string; respondentId: string; subjectId: string; scores: Record<string, number>; submittedAt: string }
export interface PreviewState { version: 2; date: string; people: PreviewPerson[]; schedules: NativeSchedule[]; campaigns: NativeCampaign[]; submissions: PreviewSubmission[] }
const KEY = 'cardiofitness-native-preview-v2';
const EVENT = 'cardiofitness-preview-updated';
export function initialPreview(): PreviewState {
  const date = '2026-11-15';
  const people: PreviewPerson[] = [
    { id:'ana', name:'Ana Oliveira', department:'Recepção', isLeader:false, leaderId:'marina', active:true },
    { id:'joao', name:'João Martins', department:'Recepção', isLeader:false, leaderId:'marina', active:true },
    { id:'bia', name:'Beatriz Souza', department:'Central', isLeader:false, leaderId:'rafael', active:true },
    { id:'pedro', name:'Pedro Santos', department:'Central', isLeader:false, leaderId:'rafael', active:true },
    { id:'marina', name:'Marina Costa', department:'Recepção', isLeader:true, leaderId:null, active:true },
    { id:'rafael', name:'Rafael Lima', department:'Central', isLeader:true, leaderId:null, active:true },
  ];
  const schedules: NativeSchedule[] = [
    {kind:'leadership',cadenceMonths:1,anchorMonth:'2026-11',enabled:true},
    {kind:'leader_to_employee',cadenceMonths:1,anchorMonth:'2026-11',enabled:true},
    {kind:'team',cadenceMonths:2,anchorMonth:'2026-11',enabled:true},
    {kind:'self',cadenceMonths:2,anchorMonth:'2026-11',enabled:true},
  ];
  return {version:2,date,people,schedules,campaigns:runNativeCycles([],schedules,people,date),submissions:[]};
}
function readPreview(): PreviewState {
  const raw = localStorage.getItem(KEY);
  if (!raw) return initialPreview();
  const value: PreviewState = JSON.parse(raw);
  if(value.version!==2 || !Array.isArray(value.campaigns)||!Array.isArray(value.submissions)||!Array.isArray(value.people)||!Array.isArray(value.schedules)) throw new Error('Os dados locais da prévia estão inválidos. Use Reiniciar demonstração.');
  return value;
}
export function usePreview() {
  const [state,setState] = useState<PreviewState>(initialPreview);
  const [ready,setReady] = useState(false);
  const [error,setError] = useState('');
  useEffect(()=>{
    const load=()=>{try {setState(readPreview());setError('');} catch(e){setError(e instanceof Error?e.message:'Não foi possível ler a demonstração.');} setReady(true);};
    load(); window.addEventListener(EVENT,load); window.addEventListener('storage',load);
    return ()=>{window.removeEventListener(EVENT,load);window.removeEventListener('storage',load);};
  },[]);
  function update(change:(current:PreviewState)=>PreviewState) {
    try {
      const next=change(readPreview());
      localStorage.setItem(KEY,JSON.stringify(next));
      setState(next); setError(''); window.dispatchEvent(new Event(EVENT)); return true;
    } catch(e) {setError(e instanceof Error?e.message:'Não foi possível salvar neste navegador.');return false;}
  }
  function reset() {try{localStorage.setItem(KEY,JSON.stringify(initialPreview()));window.dispatchEvent(new Event(EVENT));return true;}catch{setError('O armazenamento do navegador está indisponível.');return false;}}
  return {state,ready,error,update,reset};
}
export function assignmentKey(campaignId:string, respondentId:string, subjectId:string) {return `${campaignId}:${respondentId}:${subjectId}`;}
export function savePreviewSubmission(state:PreviewState,campaignId:string,respondentId:string,subjectId:string,scores:Record<string,number>):PreviewState {
  const campaign=state.campaigns.find(c=>c.id===campaignId);
  if(!campaign || campaign.status!=='open'||state.date<campaign.startDate||state.date>campaign.endDate) throw new Error('Este ciclo não está aberto.');
  if(!campaign.assignments.some(a=>a.respondentId===respondentId&&a.subjectId===subjectId)) throw new Error('Pessoa não elegível para esta avaliação.');
  const id=assignmentKey(campaignId,respondentId,subjectId);
  if(state.submissions.some(s=>s.id===id)) throw new Error('Esta avaliação já foi enviada.');
  const error=validateNativeSubmission(campaign,respondentId,subjectId,scores,state.date);
  if(error) throw new Error(error);
  return {...state,submissions:[...state.submissions,{id,campaignId,respondentId,subjectId,scores,submittedAt:new Date().toISOString()}]};
}
