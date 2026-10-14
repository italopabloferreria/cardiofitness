'use client';
import { useState } from 'react';
import type { AppData, ResponseKind } from '../lib/types';
import { KIND_LABELS } from '../lib/types';
import { compareCycles } from '../lib/comparison';
import { formatNumber } from '../lib/analytics';
export function CycleComparison({data}:{data:AppData}){
 const cycles=[...data.cycles].sort((a,b)=>a.startDate.localeCompare(b.startDate));
 const [earlier,setEarlier]=useState(cycles.at(-2)?.id??''),[later,setLater]=useState(cycles.at(-1)?.id??'');
 const [formA,setFormA]=useState(''),[formB,setFormB]=useState(''),[kind,setKind]=useState<ResponseKind>('team'),[person,setPerson]=useState(''),[department,setDepartment]=useState('');
 const formsA=data.evaluations.filter(e=>e.cycleId===earlier),formsB=data.evaluations.filter(e=>e.cycleId===later);
 const a=formsA.find(e=>e.id===formA)??formsA[0],b=formsB.find(e=>e.id===formB)??formsB.find(e=>e.kind===a?.kind);
 const perspective=a?.kind==='team'?(kind==='self'?'self':'team'):a?.kind??'team';
 const rows=compareCycles(data,{earlierCycleId:earlier,laterCycleId:later,earlierEvaluationId:a?.id??'',laterEvaluationId:b?.id??'',kind:perspective,employeeId:person||undefined,department:department||undefined});
 return <section className="panel"><header className="panel-head"><div><h2>Comparação entre ciclos</h2><p>Somente perguntas com texto, seção, escala e perspectiva equivalentes. Cada média mostra sua quantidade de respostas.</p></div></header><div className="table-filters" style={{flexWrap:'wrap'}}>
 <label>Ciclo anterior<select value={earlier} onChange={e=>{setEarlier(e.target.value);setFormA('');}}><option value="">Selecione</option>{cycles.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 <label>Ciclo seguinte<select value={later} onChange={e=>{setLater(e.target.value);setFormB('');}}><option value="">Selecione</option>{cycles.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 <label>Formulário anterior<select value={a?.id??''} onChange={e=>setFormA(e.target.value)}>{formsA.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
 <label>Formulário seguinte<select value={b?.id??''} onChange={e=>setFormB(e.target.value)}>{formsB.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
 {a?.kind==='team'&&<label>Perspectiva<select value={perspective} onChange={e=>setKind(e.target.value as ResponseKind)}><option value="team">Entre colegas</option><option value="self">Autoavaliação</option></select></label>}
 <label>Pessoa avaliada<select value={person} onChange={e=>setPerson(e.target.value)}><option value="">Todas as pessoas</option>{data.employees.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
 <label>Setor do cadastro atual<select value={department} onChange={e=>setDepartment(e.target.value)}><option value="">Todos os setores</option>{[...new Set(data.employees.map(p=>p.department))].sort().map(d=><option key={d} value={d}>{d}</option>)}</select></label>
 </div><p style={{padding:'0 24px'}}>Perspectiva: {KIND_LABELS[perspective]}. Mudanças na composição dos participantes podem afetar as médias. A diferença não representa um ranking.</p>
 {rows.length?<div className="table-scroll"><table><thead><tr><th>Seção / pergunta</th><th>Escala</th><th>Anterior / respostas</th><th>Seguinte / respostas</th><th>Diferença</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td><small>{r.section}</small><div>{r.title}</div></td><td>{r.min} a {r.max}</td><td>{formatNumber(r.earlierAverage)} / {r.earlierCount}</td><td>{formatNumber(r.laterAverage)} / {r.laterCount}</td><td>{r.delta>0?'+':''}{formatNumber(r.delta)}</td></tr>)}</tbody></table></div>:<p style={{padding:'16px 24px'}} role="status">Nenhuma pergunta com respostas comparáveis neste recorte. Selecione dois ciclos diferentes, formulários da mesma modalidade e perguntas equivalentes.</p>}</section>;
}
