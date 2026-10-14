import { expect,it } from 'vitest';
import { syncHealth } from '../src/lib/sync-health';
import type {Cycle,Evaluation} from '../src/lib/types';
const now=new Date('2026-10-14T12:00:00Z');const cycle={startDate:'2026-10-01',endDate:'2026-10-31'} as Cycle;
const form={googleFormId:'form',mapping:{scoreQuestions:[{}]},lastSyncedAt:'2026-10-14T11:59:00Z',syncMessage:'1 no histórico; 0 rejeitadas.'} as Evaluation;
it('distinguishes recent query, rejected identities, real failures and stale cache',()=>{
 expect(syncHealth(form,cycle,now).label).toBe('Consulta recente');
 expect(syncHealth({...form,syncIssues:['Identificação ambígua']},cycle,now).label).toBe('Respostas a conferir');
 expect(syncHealth({...form,syncMessage:'A autorização do Google expirou'},cycle,now).label).toBe('Requer conferência');
 expect(syncHealth({...form,lastSyncedAt:'2026-10-14T11:40:00Z'},cycle,now).label).toBe('Consulta atrasada');
});
it('does not label planned or historical cycles as scheduler failure',()=>{
 expect(syncHealth(form,{...cycle,startDate:'2026-11-01'},now).label).toBe('Aguardando início');
 expect(syncHealth(form,{...cycle,endDate:'2026-09-30'},now).label).toBe('Histórico preservado');
});
