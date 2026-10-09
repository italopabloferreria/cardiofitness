import { describe, expect, it } from 'vitest';
import { questionGroups } from '../src/lib/analytics';
import type { EvaluationResponse, ScoreQuestion } from '../src/lib/types';
const questions:ScoreQuestion[]=[{id:'a',title:'Gestão de tempo',min:1,max:4},{id:'b',title:'Gestão de tempo',min:1,max:4},{id:'c',title:'Sem resposta',min:1,max:4}];
const response=(id:string,scores:Record<string,number>)=>({id,scores} as EvaluationResponse);
describe('perguntas por seção no recorte',()=>{
 it('separa títulos iguais por ID e seção sem misturar médias ou denominadores',()=>{
  const groups=questionGroups(questions,[response('1',{a:4}),response('2',{a:2,b:3})],{a:'FATURAMENTO',b:'RECEPÇÃO',c:'ADM'});
  expect(groups.map(g=>[g.section,g.rows[0].question.id,g.rows[0].average,g.rows[0].count])).toEqual([['FATURAMENTO','a',3,2],['RECEPÇÃO','b',3,1]]);
 });
 it('oculta perguntas e seções sem resposta após filtrar a pessoa',()=>{
  expect(questionGroups(questions,[],{a:'FATURAMENTO'})).toEqual([]);
  expect(questionGroups(questions,[response('1',{b:4})],{a:'FATURAMENTO',b:'RECEPÇÃO'}).map(g=>g.section)).toEqual(['RECEPÇÃO']);
 });
 it('usa identificação geral para formulários sem seções e ignora valores não finitos',()=>{
  expect(questionGroups(questions,[response('1',{a:NaN,b:4})])).toMatchObject([{section:'Perguntas gerais',rows:[{question:{id:'b'},average:4,count:1}]}]);
 });
});
