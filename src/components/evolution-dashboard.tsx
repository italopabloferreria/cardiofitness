'use client';

import { useMemo, useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  UsersRound,
  ShieldCheck,
  CalendarDays,
  Award,
  Layers,
} from 'lucide-react';
import type { AppData, EvaluationKind } from '@/lib/types';
import { KIND_LABELS } from '@/lib/types';
import { responseAverage, formatNumber } from '@/lib/analytics';

const scoreColor = (value: number | null) =>
  value === null ? '#94a3b8' : value < 2.5 ? '#b42318' : '#067647';

interface EvolutionDashboardProps {
  data: AppData;
  activeCycleId?: string;
}

export function EvolutionDashboard({ data, activeCycleId }: EvolutionDashboardProps) {
  const [selectedPerspective, setSelectedPerspective] = useState<string>('all');

  // Ciclos ordenados cronologicamente
  const sortedCycles = useMemo(() => {
    return [...data.cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [data.cycles]);

  // Setores disponíveis
  const departments = useMemo(() => {
    const set = new Set<string>();
    data.employees.forEach(e => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [data.employees]);

  // Médias por ciclo ao longo do tempo (evolução temporal)
  const cycleTrends = useMemo(() => {
    return sortedCycles.map(cycle => {
      const cycleEvals = data.evaluations.filter(e => e.cycleId === cycle.id);
      const evalIds = new Set(cycleEvals.map(e => e.id));
      const cycleResponses = data.responses.filter(r => evalIds.has(r.evaluationId));

      const getKindAverage = (kind?: EvaluationKind) => {
        const filtered = kind ? cycleResponses.filter(r => r.kind === kind) : cycleResponses;
        const validScores = filtered
          .map(responseAverage)
          .filter((v): v is number => v !== null && !isNaN(v));
        if (!validScores.length) return null;
        return Number((validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2));
      };

      return {
        id: cycle.id,
        name: cycle.name,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        totalResponses: cycleResponses.length,
        overallAvg: getKindAverage(),
        leadershipAvg: getKindAverage('leadership'),
        teamAvg: getKindAverage('team'),
        selfAvg: getKindAverage('self'),
      };
    });
  }, [sortedCycles, data.evaluations, data.responses]);

  // Médias por setor no ciclo selecionado (ou no mais recente)
  const targetCycleId = activeCycleId || sortedCycles[sortedCycles.length - 1]?.id;

  const departmentMetrics = useMemo(() => {
    if (!targetCycleId) return [];
    const cycleEvals = data.evaluations.filter(e => e.cycleId === targetCycleId);
    const evalIds = new Set(cycleEvals.map(e => e.id));
    const cycleResponses = data.responses.filter(r => evalIds.has(r.evaluationId));

    return departments.map(dept => {
      const empsInDept = new Set(data.employees.filter(e => e.department === dept).map(e => e.id));
      // Respostas onde o avaliado pertence a este setor
      const deptResponses = cycleResponses.filter(r => empsInDept.has(r.subjectId));

      const scores = deptResponses
        .map(responseAverage)
        .filter((v): v is number => v !== null && !isNaN(v));

      const avg = scores.length ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : null;

      return {
        department: dept,
        responsesCount: deptResponses.length,
        average: avg,
        headcount: empsInDept.size,
      };
    }).sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
  }, [targetCycleId, data.evaluations, data.responses, data.employees, departments]);

  // Distribuição geral de notas (1 a 4)
  const scoreDistribution = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let total = 0;

    data.responses.forEach(r => {
      if (r.scores) {
        Object.values(r.scores).forEach(val => {
          if (val >= 1 && val <= 4) {
            counts[val as 1 | 2 | 3 | 4] = (counts[val as 1 | 2 | 3 | 4] || 0) + 1;
            total++;
          }
        });
      }
    });

    return {
      counts,
      total,
      percentages: {
        1: total ? Math.round((counts[1] / total) * 100) : 0,
        2: total ? Math.round((counts[2] / total) * 100) : 0,
        3: total ? Math.round((counts[3] / total) * 100) : 0,
        4: total ? Math.round((counts[4] / total) * 100) : 0,
      },
    };
  }, [data.responses]);

  // Dimensões do gráfico SVG de evolução
  const svgWidth = 620;
  const svgHeight = 220;
  const paddingX = 60;
  const paddingY = 30;

  const getY = (val: number) => {
    // Escala 1.0 a 4.0
    const clamped = Math.max(1, Math.min(4, val));
    const range = 4 - 1;
    const ratio = (clamped - 1) / range;
    return (svgHeight - paddingY) - ratio * (svgHeight - paddingY * 2);
  };

  const getX = (index: number) => {
    if (cycleTrends.length <= 1) return svgWidth / 2;
    const step = (svgWidth - paddingX * 2) / (cycleTrends.length - 1);
    return paddingX + index * step;
  };

  const activeTrendPoints = useMemo(() => {
    return cycleTrends.map((c, i) => {
      let val: number | null = c.overallAvg;
      if (selectedPerspective === 'leadership') val = c.leadershipAvg;
      if (selectedPerspective === 'team') val = c.teamAvg;
      if (selectedPerspective === 'self') val = c.selfAvg;

      return {
        x: getX(i),
        y: val !== null ? getY(val) : null,
        value: val,
        cycleName: c.name,
        responses: c.totalResponses,
      };
    });
  }, [cycleTrends, selectedPerspective]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Cabeçalho do Painel de Evolução */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#0573b9', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <TrendingUp size={18} /> Indicadores e Evolução Histórica
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '4px 0 6px' }}>
              Painel de Evolução dos Ciclos de Avaliação
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Acompanhamento do desenvolvimento da clínica, comparativo de setores e evolução das médias ciclo a ciclo.
            </p>
          </div>

          {/* Filtro de Perspectiva */}
          <div style={{ display: 'flex', gap: 6, background: '#f8fafc', padding: 4, borderRadius: 10, border: '1px solid #e2e8f0' }}>
            {[
              { id: 'all', label: 'Média Geral' },
              { id: 'leadership', label: 'Líderes' },
              { id: 'team', label: 'Equipe' },
              { id: 'self', label: 'Autoavaliação' },
            ].map(btn => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setSelectedPerspective(btn.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: selectedPerspective === btn.id ? 700 : 500,
                  border: 'none',
                  cursor: 'pointer',
                  background: selectedPerspective === btn.id ? '#0573b9' : 'transparent',
                  color: selectedPerspective === btn.id ? '#fff' : '#64748b',
                  transition: 'all 0.15s ease',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Gráfico SVG de Evolução Temporal */}
        <div style={{ marginTop: 24, padding: '16px 0', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 size={16} /> Evolução das Médias (Escala 1.0 a 4.0)
            </span>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Baseado em <b>{data.responses.length}</b> respostas computadas
            </span>
          </div>

          <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              style={{ width: '100%', maxHeight: 220, overflow: 'visible', background: '#fafbfc', borderRadius: 10, border: '1px solid #edf2f7' }}
            >
              {/* Linhas de Grade e Valores da Escala */}
              {[1, 2, 3, 4].map(score => {
                const y = getY(score);
                return (
                  <g key={score}>
                    <line x1={paddingX - 10} y1={y} x2={svgWidth - paddingX + 10} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                    <text x={paddingX - 25} y={y + 4} fontSize="11" fill="#94a3b8" fontWeight="600" textAnchor="end">
                      {score}.0
                    </text>
                  </g>
                );
              })}

              {/* Linha de Conexão dos Pontos */}
              {activeTrendPoints.length > 1 && (
                <path
                  d={activeTrendPoints
                    .filter(p => p.y !== null)
                    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                    .join(' ')}
                  fill="none"
                  stroke="#0573b9"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Pontos e Rótulos */}
              {activeTrendPoints.map((p, idx) => {
                if (p.y === null || p.value === null) return null;
                return (
                  <g key={idx}>
                    {/* Linha vertical até o eixo */}
                    <line x1={p.x} y1={p.y} x2={p.x} y2={svgHeight - paddingY} stroke="#e2e8f0" strokeWidth="1" />

                    {/* Ponto */}
                    <circle cx={p.x} cy={p.y} r="7" fill="#fff" stroke="#0573b9" strokeWidth="3" />
                    <circle cx={p.x} cy={p.y} r="3" fill="#0573b9" />

                    {/* Valor numérico acima do ponto */}
                    <text x={p.x} y={p.y - 12} fontSize="12" fontWeight="800" fill="#0f172a" textAnchor="middle">
                      {p.value.toFixed(2)}
                    </text>

                    {/* Nome do ciclo no eixo X */}
                    <text x={p.x} y={svgHeight - 10} fontSize="11" fill="#475467" fontWeight="600" textAnchor="middle">
                      {p.cycleName}
                    </text>
                  </g>
                );
              })}

              {!activeTrendPoints.some(p => p.value !== null) && (
                <text x={svgWidth / 2} y={svgHeight / 2} textAnchor="middle" fill="#94a3b8" fontSize="13">
                  Nenhum resultado registrado nos ciclos para esta perspectiva.
                </text>
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* Grid com 2 Colunas: Desempenho por Setor & Distribuição de Notas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {/* Coluna 1: Médias por Setor */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={18} color="#0573b9" /> Desempenho Médio por Setor
            </h3>
            <span style={{ fontSize: 12, color: '#64748b' }}>Escala de 1 a 4</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {departmentMetrics.map(dept => {
              const val = dept.average ?? 0;
              const pct = val ? Math.min(100, Math.max(0, ((val - 1) / 3) * 100)) : 0;
              const color = val ? scoreColor(val) : '#cbd5e1';

              return (
                <div key={dept.department}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <div>
                      <b style={{ fontSize: 13, color: '#1e293b' }}>{dept.department}</b>
                      <small style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>
                        {dept.responsesCount} respostas · {dept.headcount} pessoas
                      </small>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: val ? '#0573b9' : '#94a3b8' }}>
                      {dept.average !== null ? dept.average.toFixed(2) : '—'}
                    </span>
                  </div>

                  {/* Barra de Progresso com Cor Semântica */}
                  <div style={{ height: 10, width: '100%', background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: color,
                        borderRadius: 6,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {!departmentMetrics.length && (
              <p style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic', textAlign: 'center', margin: '20px 0' }}>
                Nenhuma resposta registrada neste ciclo ainda.
              </p>
            )}
          </div>
        </div>

        {/* Coluna 2: Distribuição Geral das Notas da Clínica */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={18} color="#0573b9" /> Distribuição Geral das Notas
            </h3>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              {scoreDistribution.total} avaliações
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, textAlign: 'center', marginTop: 18 }}>
            {[
              { val: 1, label: 'Precisa melhorar', color: '#f04438', bg: '#fef3f2' },
              { val: 2, label: 'Em desenvolvimento', color: '#f79009', bg: '#fffaeb' },
              { val: 3, label: 'Atende', color: '#12b76a', bg: '#ecfdf3' },
              { val: 4, label: 'Supera', color: '#0573b9', bg: '#f0f7fd' },
            ].map(col => {
              const count = scoreDistribution.counts[col.val as 1 | 2 | 3 | 4];
              const pct = scoreDistribution.percentages[col.val as 1 | 2 | 3 | 4];

              return (
                <div
                  key={col.val}
                  style={{
                    background: col.bg,
                    border: `1px solid ${col.color}30`,
                    borderRadius: 12,
                    padding: '16px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 24, fontWeight: 900, color: col.color }}>{col.val}</span>
                  <b style={{ fontSize: 16, color: '#0f172a' }}>{pct}%</b>
                  <small style={{ fontSize: 11, color: '#475467', lineHeight: 1.2 }}>
                    {count} {count === 1 ? 'nota' : 'notas'}
                  </small>
                  <span style={{ fontSize: 10, fontWeight: 700, color: col.color, marginTop: 4 }}>
                    {col.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 22, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={16} color="#0573b9" />
            <span>Dados consolidados de todos os ciclos cadastrados na Cardiofitness.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
