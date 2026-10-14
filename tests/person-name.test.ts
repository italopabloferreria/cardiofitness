import { expect, it, vi } from 'vitest';
import { formatPersonName } from '../src/lib/person-name';
vi.mock('server-only',()=>({}));
import { employeeFromRow } from '../src/lib/server/data';
it('formats Portuguese names preserving accents, particles, hyphens and suffixes',()=>{
 expect(formatPersonName('  MARIA   DA CONCEIÇÃO DOS SANTOS ')).toBe('MARIA DA CONCEIÇÃO DOS SANTOS');
 expect(formatPersonName('ANA-LÚCIA D’ÁVILA 2.')).toBe('ANA-LÚCIA D’ÁVILA 2.');
 expect(formatPersonName('João e Maria')).toBe('JOÃO E MARIA');
 expect(formatPersonName('')).toBe('');
});
it('formats existing display names without changing identification fields or links',()=>{
 const person=employeeFromRow({id:'id',name:'MARIA DO SOCORRO',email:'email@example.com',form_name:'MARIA DO SOCORRO',department:'COPEIRAS',leader_id:'leader',is_leader:false,active:true});
 expect(person.name).toBe('MARIA DO SOCORRO');expect(person.formName).toBe('MARIA DO SOCORRO');expect(person.leaderId).toBe('leader');
});
