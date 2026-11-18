'use client';

import { useMemo, useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  User,
  UsersRound,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CalendarDays,
  ShieldCheck,
  Search,
} from 'lucide-react';
import type { AppData, Employee, EvaluationResponse, ResponseKind } from '../lib/types';
import { KIND_LABELS } from '../lib/types';
import { compareCycles } from '../lib/comparison';
import { formatDate, formatNumber } from '../lib/analytics';
import { responseAverage } from '../lib/analytics';

interface CycleComparisonProps {
  data: AppData;
}

const scoreColor = (val: number | null) =>
  val === null ? '#94a3b8' : val < 2.5 ? '#b42318' : '#067647';

function calcCycleScores(data: AppData, employeeId: string, cycleId: string) {
  const cycleEvalIds = new Set(data.evaluations.filter(e => e.cycleId === cycleId).map(e => e.id));
  const responses = data.responses.filter(r => r.subjectId === employeeId && cycleEvalIds.has(r.evaluationId));

  const calcAvg = (list: EvaluationResponse[]) => {
    const avgs = list.map(responseAverage).filter((v): v is number => v !== null);
    return avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;
  };

  const selfResp = responses.filter(r => r.kind === 'self');
  const teamResp = responses.filter(r => r.kind === 'team');
  const leadResp = responses.filter(r => r.kind === 'leadership' || r.kind === 'leader_to_employee');

  return {
    self: calcAvg(selfResp),
    team: calcAvg(teamResp),
    leadership: calcAvg(leadResp),
    overall: calcAvg(responses),
    count: responses.length,
  };
}

export function CycleComparison({ data }: CycleComparisonProps) {
  const [tab, setTab] = useState<'employee' | 'cycles'>('employee');

  // Ciclos ordenados cronologicamente
  const cycles = useMemo(() => {
    return [...data.cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [data.cycles]);

  // Colaboradores ativos ordenados por nome
  const employees = useMemo(() => {
    return [...data.employees].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [data.employees]);

  // Estado da aba "Evolução do Colaborador"
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employees[0]?.id || '');
  const [searchEmployee, setSearchEmployee] = useState('');

  // Estado da aba "Comparativo entre Ciclos"
  const [earlierCycleId, setEarlierCycleId] = useState(cycles.at(-2)?.id || cycles[0]?.id || '');
  const [laterCycleId, setLaterCycleId] = useState(cycles.at(-1)?.id || '');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Estados do detalhamento por pergunta legado
  const [showQuestionDetail, setShowQuestionDetail] = useState(false);
  const [formA, setFormA] = useState('');
  const [formB, setFormB] = useState('');
  const [kind, setKind] = useState<ResponseKind>('team');

  const selectedEmployee = useMemo(() => {
    return data.employees.find(e => e.id === selectedEmployeeId);
  }, [data.employees, selectedEmployeeId]);

  // Histórico de notas do colaborador selecionado através de todos os ciclos
  const employeeHistory = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return cycles.map(cycle => {
      const scores = calcCycleScores(data, selectedEmployeeId, cycle.id);
      return {
        cycle,
        ...scores,
      };
    });
  }, [cycles, data, selectedEmployeeId]);

  // Comparativo entre Ciclo A e Ciclo B
  const earlierCycle = cycles.find(c => c.id === earlierCycleId);
  const laterCycle = cycles.find(c => c.id === laterCycleId);

  const cycleComparisonData = useMemo(() => {
    if (!earlierCycleId || !laterCycleId) return null;

    const filteredEmployees = employees.filter(e =>
      !departmentFilter || e.department === departmentFilter
    );

    const rows = filteredEmployees.map(emp => {
      const earlier = calcCycleScores(data, emp.id, earlierCycleId);
      const later = calcCycleScores(data, emp.id, laterCycleId);
      const delta = earlier.overall !== null && later.overall !== null
        ? later.overall - earlier.overall
        : null;

      return {
        employee: emp,
        earlierScore: earlier.overall,
        laterScore: later.overall,
        delta,
      };
    });

    const earlierTotalScores = rows.map(r => r.earlierScore).filter((v): v is number => v !== null);
    const laterTotalScores = rows.map(r => r.laterScore).filter((v): v is number => v !== null);

    const earlierAvg = earlierTotalScores.length
      ? earlierTotalScores.reduce((a, b) => a + b, 0) / earlierTotalScores.length
      : null;
    const laterAvg = laterTotalScores.length
      ? laterTotalScores.reduce((a, b) => a + b, 0) / laterTotalScores.length
      : null;

    const overallDelta = earlierAvg !== null && laterAvg !== null ? laterAvg - earlierAvg : null;

    return {
      rows,
      earlierAvg,
      laterAvg,
      overallDelta,
    };
  }, [employees, earlierCycleId, laterCycleId, departmentFilter, data]);

  // Execução do compareCycles legado caso o RH deseje abrir o detalhamento por pergunta
  const formsA = data.evaluations.filter(e => e.cycleId === earlierCycleId);
  const formsB = data.evaluations.filter(e => e.cycleId === laterCycleId);
  const evalA = formsA.find(e => e.id === formA) || formsA[0];
  const evalB = formsB.find(e => e.id === formB) || formsB.find(e => e.kind === evalA?.kind);
  const legacyPerspective = evalA?.kind === 'team' ? (kind === 'self' ? 'self' : 'team') : evalA?.kind || 'team';

  const legacyRows = useMemo(() => {
    if (!showQuestionDetail || !earlierCycleId || !laterCycleId || !evalA || !evalB) return [];
    return compareCycles(data, {
      earlierCycleId,
      laterCycleId,
      earlierEvaluationId: evalA.id,
      laterEvaluationId: evalB.id,
      kind: legacyPerspective,
      department: departmentFilter || undefined,
    });
  }, [showQuestionDetail, data, earlierCycleId, laterCycleId, evalA, evalB, legacyPerspective, departmentFilter]);

  return (
    <section className="panel" style={{ marginTop: 24 }}>
      <header className="panel-head" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingUp size={22} style={{ color: '#009bd2' }} />
            Comparação e Evolução entre Ciclos
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>
            Acompanhe a curva de evolução individual de cada colaborador ou compare o desempenho geral entre dois ciclos da clínica.
          </p>
        </div>

        {/* Abas Superiores */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            type="button"
            className={`button ${tab === 'employee' ? 'primary' : ''}`}
            onClick={() => setTab('employee')}
            style={{ fontSize: 13, height: 38 }}
          >
            <User size={16} /> Evolução Individual do Colaborador
          </button>
          <button
            type="button"
            className={`button ${tab === 'cycles' ? 'primary' : ''}`}
            onClick={() => setTab('cycles')}
            style={{ fontSize: 13, height: 38 }}
          >
            <BarChart3 size={16} /> Comparativo entre 2 Ciclos
          </button>
        </div>
      </header>

      {/* ABA 1: EVOLUÇÃO INDIVIDUAL DO COLABORADOR */}
      {tab === 'employee' && (
        <div style={{ padding: '20px 24px' }}>
          {/* Barra de Filtro do Colaborador */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
            <div style={{ minWidth: 280, flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#475467', marginBottom: 6 }}>
                Selecione o Colaborador
              </label>
              <select
                className="input"
                value={selectedEmployeeId}
                onChange={e => setSelectedEmployeeId(e.target.value)}
                style={{ width: '100%', height: 42, fontSize: 15, fontWeight: 600, color: '#0f172a' }}
              >
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} — {e.department} {e.isLeader ? '(Líder)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedEmployee && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#f8fafc', padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#009bd2', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 16 }}>
                  {selectedEmployee.name.charAt(0)}
                </div>
                <div>
                  <b style={{ fontSize: 14, color: '#0f172a', display: 'block' }}>{selectedEmployee.name}</b>
                  <small style={{ color: '#64748b' }}>{selectedEmployee.department} {selectedEmployee.isLeader ? '· Líder' : ''}</small>
                </div>
              </div>
            )}
          </div>

          {/* Gráfico de Evolução SVG */}
          {selectedEmployee && employeeHistory.some(h => h.overall !== null) ? (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '24px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Curva de Notas ao Longo dos Ciclos
                </h3>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, fontWeight: 600 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#009bd2' }}>
                    <i style={{ width: 10, height: 10, borderRadius: '50%', background: '#009bd2', display: 'inline-block' }} /> Média Geral
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#16a34a' }}>
                    <i style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} /> Avaliação da Equipe
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9333ea' }}>
                    <i style={{ width: 10, height: 10, borderRadius: '50%', background: '#9333ea', display: 'inline-block' }} /> Autoavaliação
                  </span>
                </div>
              </div>

              {/* Renderização do gráfico SVG */}
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <svg viewBox="0 0 600 220" style={{ width: '100%', minWidth: 480, height: 220 }}>
                  {/* Linhas da escala 1 a 4 */}
                  {[1, 2, 3, 4].map(val => {
                    const y = 180 - ((val - 1) / 3) * 140;
                    return (
                      <g key={val}>
                        <line x1="50" y1={y} x2="570" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                        <text x="35" y={y + 4} fontSize="12" fill="#94a3b8" textAnchor="end">{val}.0</text>
                      </g>
                    );
                  })}

                  {/* Linhas e pontos de cada ciclo */}
                  {employeeHistory.map((h, idx) => {
                    const x = 70 + (idx / Math.max(1, employeeHistory.length - 1)) * 480;
                    const prevH = idx > 0 ? employeeHistory[idx - 1] : null;
                    const prevX = idx > 0 ? 70 + ((idx - 1) / Math.max(1, employeeHistory.length - 1)) * 480 : 0;

                    const yOverall = h.overall !== null ? 180 - ((h.overall - 1) / 3) * 140 : null;
                    const prevYOverall = prevH && prevH.overall !== null ? 180 - ((prevH.overall - 1) / 3) * 140 : null;

                    return (
                      <g key={h.cycle.id}>
                        {/* Linha que conecta ciclos */}
                        {prevYOverall !== null && yOverall !== null && (
                          <line x1={prevX} y1={prevYOverall} x2={x} y2={yOverall} stroke="#009bd2" strokeWidth="3" />
                        )}

                        {/* Ponto e valor */}
                        {yOverall !== null && (
                          <>
                            <circle cx={x} cy={yOverall} r="6" fill="#fff" stroke="#009bd2" strokeWidth="3" />
                            <text x={x} y={yOverall - 10} fontSize="12" fontWeight="700" fill="#009bd2" textAnchor="middle">
                              {formatNumber(h.overall)}
                            </text>
                          </>
                        )}

                        {/* Rótulo do ciclo no eixo X */}
                        <text x={x} y="205" fontSize="11" fill="#475467" textAnchor="middle" fontWeight="500">
                          {h.cycle.name.split('/')[0].trim()}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          ) : (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '32px', textAlign: 'center', marginBottom: 24 }}>
              <p style={{ color: '#64748b', margin: 0, fontSize: 14 }}>
                Nenhuma avaliação registrada para <b>{selectedEmployee?.name}</b> nos ciclos atuais.
              </p>
            </div>
          )}

          {/* Tabela de Histórico por Ciclo */}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Ciclo</th>
                  <th>Período</th>
                  <th>Autoavaliação</th>
                  <th>Avaliação da Equipe</th>
                  <th>Avaliação Liderança</th>
                  <th>Média Geral</th>
                  <th>Evolução</th>
                </tr>
              </thead>
              <tbody>
                {employeeHistory.map((h, idx) => {
                  const prev = idx > 0 ? employeeHistory[idx - 1] : null;
                  const delta = h.overall !== null && prev && prev.overall !== null ? h.overall - prev.overall : null;

                  return (
                    <tr key={h.cycle.id}>
                      <td className="strong">{h.cycle.name}</td>
                      <td>{formatDate(h.cycle.startDate)} a {formatDate(h.cycle.endDate)}</td>
                      <td>
                        {h.self !== null ? <span style={{ color: scoreColor(h.self), fontWeight: 600 }}>{formatNumber(h.self)}</span> : '—'}
                      </td>
                      <td>
                        {h.team !== null ? <span style={{ color: scoreColor(h.team), fontWeight: 600 }}>{formatNumber(h.team)}</span> : '—'}
                      </td>
                      <td>
                        {h.leadership !== null ? <span style={{ color: scoreColor(h.leadership), fontWeight: 600 }}>{formatNumber(h.leadership)}</span> : '—'}
                      </td>
                      <td className="score-cell">
                        {h.overall !== null ? (
                          <b style={{ color: scoreColor(h.overall), fontSize: 15 }}>
                            {formatNumber(h.overall)}
                          </b>
                        ) : '—'}
                      </td>
                      <td>
                        {delta !== null ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 700,
                            background: delta > 0 ? '#ecfdf5' : delta < 0 ? '#fef2f2' : '#f1f5f9',
                            color: delta > 0 ? '#059669' : delta < 0 ? '#b91c1c' : '#475467',
                          }}>
                            {delta > 0 ? <ArrowUpRight size={14} /> : delta < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                            {delta > 0 ? `+${formatNumber(delta)}` : formatNumber(delta)}
                          </span>
                        ) : (
                          <small style={{ color: '#94a3b8' }}>Ciclo base</small>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 2: COMPARATIVO DIRETO ENTRE DOIS CICLOS */}
      {tab === 'cycles' && (
        <div style={{ padding: '20px 24px' }}>
          {/* Seleção dos 2 Ciclos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24, background: '#f8fafc', padding: '16px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#475467', marginBottom: 6 }}>
                1. Ciclo Anterior (Referência)
              </label>
              <select
                className="input"
                value={earlierCycleId}
                onChange={e => setEarlierCycleId(e.target.value)}
                style={{ width: '100%', height: 42, fontSize: 14, fontWeight: 600 }}
              >
                {cycles.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({formatDate(c.startDate)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#475467', marginBottom: 6 }}>
                2. Ciclo Posterior (Comparação)
              </label>
              <select
                className="input"
                value={laterCycleId}
                onChange={e => setLaterCycleId(e.target.value)}
                style={{ width: '100%', height: 42, fontSize: 14, fontWeight: 600 }}
              >
                {cycles.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({formatDate(c.startDate)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#475467', marginBottom: 6 }}>
                Filtrar por Setor
              </label>
              <select
                className="input"
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                style={{ width: '100%', height: 42, fontSize: 14 }}
              >
                <option value="">Todos os setores</option>
                {Array.from(new Set(data.employees.map(e => e.department))).sort().map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cards de Resumo Comparativo */}
          {cycleComparisonData && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px' }}>
                  <small style={{ color: '#64748b', fontSize: 12, fontWeight: 600, display: 'block' }}>MÉDIA {earlierCycle?.name}</small>
                  <b style={{ fontSize: 24, color: scoreColor(cycleComparisonData.earlierAvg), margin: '4px 0', display: 'block' }}>
                    {formatNumber(cycleComparisonData.earlierAvg)} <small style={{ fontSize: 13, color: '#94a3b8' }}>/ 4</small>
                  </b>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Ciclo de referência</span>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px' }}>
                  <small style={{ color: '#64748b', fontSize: 12, fontWeight: 600, display: 'block' }}>MÉDIA {laterCycle?.name}</small>
                  <b style={{ fontSize: 24, color: scoreColor(cycleComparisonData.laterAvg), margin: '4px 0', display: 'block' }}>
                    {formatNumber(cycleComparisonData.laterAvg)} <small style={{ fontSize: 13, color: '#94a3b8' }}>/ 4</small>
                  </b>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Ciclo avaliado</span>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px' }}>
                  <small style={{ color: '#64748b', fontSize: 12, fontWeight: 600, display: 'block' }}>EVOLUÇÃO GLOBAL</small>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0' }}>
                    <b style={{
                      fontSize: 24,
                      color: cycleComparisonData.overallDelta !== null && cycleComparisonData.overallDelta >= 0 ? '#059669' : '#dc2626'
                    }}>
                      {cycleComparisonData.overallDelta !== null ? (cycleComparisonData.overallDelta > 0 ? `+${formatNumber(cycleComparisonData.overallDelta)}` : formatNumber(cycleComparisonData.overallDelta)) : '—'}
                    </b>
                    {cycleComparisonData.overallDelta !== null && (
                      cycleComparisonData.overallDelta >= 0 ? <ArrowUpRight size={22} style={{ color: '#059669' }} /> : <ArrowDownRight size={22} style={{ color: '#dc2626' }} />
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Diferença entre médias</span>
                </div>
              </div>

              {/* Tabela de Colaboradores Comparados */}
              <div className="table-scroll" style={{ marginBottom: 20 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Colaborador</th>
                      <th>Setor</th>
                      <th>Média {earlierCycle?.name}</th>
                      <th>Média {laterCycle?.name}</th>
                      <th>Variação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cycleComparisonData.rows.map(row => (
                      <tr key={row.employee.id}>
                        <td className="strong">{row.employee.name}</td>
                        <td>{row.employee.department}</td>
                        <td className="score-cell">
                          {row.earlierScore !== null ? (
                            <span style={{ color: scoreColor(row.earlierScore), fontWeight: 600 }}>
                              {formatNumber(row.earlierScore)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="score-cell">
                          {row.laterScore !== null ? (
                            <span style={{ color: scoreColor(row.laterScore), fontWeight: 600 }}>
                              {formatNumber(row.laterScore)}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          {row.delta !== null ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 8px',
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 700,
                              background: row.delta > 0 ? '#ecfdf5' : row.delta < 0 ? '#fef2f2' : '#f1f5f9',
                              color: row.delta > 0 ? '#059669' : row.delta < 0 ? '#b91c1c' : '#475467',
                            }}>
                              {row.delta > 0 ? `+${formatNumber(row.delta)}` : formatNumber(row.delta)}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Acordeão para o Detalhamento por Pergunta Equivalente */}
          <details
            open={showQuestionDetail}
            onToggle={e => setShowQuestionDetail((e.target as HTMLDetailsElement).open)}
            style={{ marginTop: 24, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px' }}
          >
            <summary style={{ fontWeight: 700, color: '#0f172a', cursor: 'pointer', fontSize: 14 }}>
              🔍 Exibir auditoria detalhada por pergunta individual (Modo avançado)
            </summary>

            {showQuestionDetail && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                  Compara perguntas equivalentes com mesma seção e escala entre os dois formulários selecionados.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                  <label style={{ fontSize: 13 }}>
                    Formulário Ciclo A:
                    <select
                      className="input"
                      value={evalA?.id || ''}
                      onChange={e => setFormA(e.target.value)}
                      style={{ width: '100%', marginTop: 4 }}
                    >
                      {formsA.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </label>

                  <label style={{ fontSize: 13 }}>
                    Formulário Ciclo B:
                    <select
                      className="input"
                      value={evalB?.id || ''}
                      onChange={e => setFormB(e.target.value)}
                      style={{ width: '100%', marginTop: 4 }}
                    >
                      {formsB.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </label>

                  {evalA?.kind === 'team' && (
                    <label style={{ fontSize: 13 }}>
                      Perspectiva:
                      <select
                        className="input"
                        value={kind}
                        onChange={e => setKind(e.target.value as ResponseKind)}
                        style={{ width: '100%', marginTop: 4 }}
                      >
                        <option value="team">Entre colegas</option>
                        <option value="self">Autoavaliação</option>
                      </select>
                    </label>
                  )}
                </div>

                {legacyRows.length > 0 ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Seção / Pergunta</th>
                          <th>Escala</th>
                          <th>Média Ciclo A</th>
                          <th>Média Ciclo B</th>
                          <th>Diferença</th>
                        </tr>
                      </thead>
                      <tbody>
                        {legacyRows.map((r, i) => (
                          <tr key={i}>
                            <td>
                              <small style={{ color: '#64748b' }}>{r.section}</small>
                              <div>{r.title}</div>
                            </td>
                            <td>{r.min} a {r.max}</td>
                            <td>{formatNumber(r.earlierAverage)} ({r.earlierCount})</td>
                            <td>{formatNumber(r.laterAverage)} ({r.laterCount})</td>
                            <td style={{ color: r.delta >= 0 ? '#059669' : '#dc2626', fontWeight: 700 }}>
                              {r.delta > 0 ? `+${formatNumber(r.delta)}` : formatNumber(r.delta)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: '#64748b', fontSize: 13, margin: '12px 0 0' }}>
                    Nenhuma pergunta compatível identificada com os mesmos IDs e seções neste recorte.
                  </p>
                )}
              </div>
            )}
          </details>
        </div>
      )}
    </section>
  );
}
