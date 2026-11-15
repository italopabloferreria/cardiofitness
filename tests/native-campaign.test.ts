import {describe,expect,it} from 'vitest';
import {nativeAssignments,nativePeriodForMonth,type NativePerson} from '../src/lib/native/campaign';

const people:NativePerson[]=[
 {id:'leadA',department:'Recepção',isLeader:true,leaderId:null,active:true},
 {id:'leadB',department:'Central',isLeader:true,leaderId:null,active:true},
 {id:'a',department:'Recepção',isLeader:false,leaderId:'leadA',active:true},
 {id:'b',department:'Recepção',isLeader:false,leaderId:'leadA',active:true},
 {id:'c',department:'Central',isLeader:false,leaderId:'leadB',active:true},
 {id:'inactive',department:'Recepção',isLeader:false,leaderId:'leadA',active:false},
 {id:'orphan',department:'Recepção',isLeader:false,leaderId:'missing',active:true},
];
describe('campanhas nativas — calendário',()=>{
 it('abre mês a mês a partir de uma âncora aprovada pelo RH, sem datas extras',()=>{
  const policy={kind:'leadership' as const,cadenceMonths:1 as const,anchorMonth:'2026-11',enabled:true};
  expect(nativePeriodForMonth(policy,'2026-11')).toEqual({kind:'leadership',startDate:'2026-11-01',endDate:'2026-11-30'});
  expect(nativePeriodForMonth(policy,'2026-12')?.endDate).toBe('2026-12-31');
  expect(nativePeriodForMonth(policy,'2027-02')?.endDate).toBe('2027-02-28');
  expect(nativePeriodForMonth(policy,'2026-10')).toBeNull();
  expect(nativePeriodForMonth({...policy,enabled:false},'2026-12')).toBeNull();
 });
 it('respeita abertura bimestral inclusive cruzando ano e ano bissexto',()=>{
  const policy={kind:'team' as const,cadenceMonths:2 as const,anchorMonth:'2026-11',enabled:true};
  expect(nativePeriodForMonth(policy,'2026-11')?.endDate).toBe('2026-12-31');
  expect(nativePeriodForMonth(policy,'2026-12')).toBeNull();
  expect(nativePeriodForMonth(policy,'2027-01')).toEqual({kind:'team',startDate:'2027-01-01',endDate:'2027-02-28'});
  expect(nativePeriodForMonth({...policy,anchorMonth:'2028-01'},'2028-01')?.endDate).toBe('2028-02-29');
 });
 it('recusa âncoras e períodos inválidos',()=>{
  expect(nativePeriodForMonth({kind:'team',cadenceMonths:2,anchorMonth:'2026-00',enabled:true},'2026-11')).toBeNull();
  expect(nativePeriodForMonth({kind:'team',cadenceMonths:2,anchorMonth:'2026-11',enabled:true},'2026-13')).toBeNull();
 });
});
describe('atribuições nativas — permissão por vínculo congelado',()=>{
 it('funcionários avaliam somente seu líder, nunca um líder inexistente',()=>{
  const pairs=nativeAssignments(people,'leadership');
  expect(pairs).toHaveLength(3);
  expect(pairs.every(x=>x.subjectId=== (x.respondentId==='c'?'leadB':'leadA'))).toBe(true);
  expect(pairs.some(x=>x.respondentId==='orphan'||x.respondentId==='inactive')).toBe(false);
 });
 it('lideranças avaliam somente suas equipes',()=>{
  const pairs=nativeAssignments(people,'leader_to_employee');
  expect(pairs).toEqual([
   {respondentId:'leadA',subjectId:'a',kind:'leader_to_employee'},
   {respondentId:'leadA',subjectId:'b',kind:'leader_to_employee'},
   {respondentId:'leadB',subjectId:'c',kind:'leader_to_employee'},
  ]);
 });
 it('colegas apenas mesmo setor, sem autoavaliação e sem inativos',()=>{
  const pairs=nativeAssignments(people,'team');
  expect(pairs.some(p=>p.respondentId===p.subjectId)).toBe(false);
  expect(pairs.some(p=>p.subjectId==='inactive')).toBe(false);
  expect(pairs.some(p=>p.respondentId==='a'&&p.subjectId==='c')).toBe(false);
  expect(pairs.some(p=>p.respondentId==='a'&&p.subjectId==='b')).toBe(true);
 });
 it('autoavaliação é um tipo próprio',()=>{
  const pairs=nativeAssignments(people,'self');
  expect(pairs.every(p=>p.respondentId===p.subjectId&&p.kind==='self')).toBe(true);
  expect(pairs).toHaveLength(4);
 });
});
