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
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import type { AppData, EvaluationKind } from '@/lib/types';
import { responseAverage, formatNumber } from '@/lib/analytics';

const DEPT_THEMES: Record<string, { bar: string; text: string; bg: string }> = {
  'RECEPCÃO E TRIAGEM': { bar: '#0284c7', text: '#0369a1', bg: '#f0f9ff' },
  'RECEPÇÃO E TRIAGEM': { bar: '#0284c7', text: '#0369a1', bg: '#f0f9ff' },
  'FATURAMENTO': { bar: '#6366f1', text: '#4338ca', bg: '#eef2ff' },
  'CENTRAL E RESULTADOS': { bar: '#8b5cf6', text: '#6d28d9', bg: '#f5f3ff' },
  'TÉCNICAS E CORREDOR / COPEIRAS': { bar: '#10b981', text: '#047857', bg: '#ecfdf5' },
  'ADMINISTRATIVO': { bar: '#f59e0b', text: '#b45309', bg: '#fffbeb' },
  'SUPORTE': { bar: '#06b6d4', text: '#0e7490', bg: '#ecfeff' },
};

function getDeptTheme(deptName: string, index: number) {
  const norm = deptName.trim().toUpperCase();
  if (DEPT_THEMES[norm]) return DEPT_THEMES[norm];
  const palette = [
    { bar: '#0284c7', text: '#0369a1', bg: '#f0f9ff' },
    { bar: '#6366f1', text: '#4338ca', bg: '#eef2ff' },
    { bar: '#10b981', text: '#047857', bg: '#ecfdf5' },
    { bar: '#8b5cf6', text: '#6d28d9', bg: '#f5f3ff' },
    { bar: '#f59e0b', text: '#b45309', bg: '#fffbeb' },
    { bar: '#06b6d4', text: '#0e7490', bg: '#ecfeff' },
  ];
  return palette[index % palette.length];
}

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

  // Comparativo Direto entre Ciclos (Outubro vs. Novembro)
  const cycleComparison = useMemo(() => {
    if (cycleTrends.length < 2) return null;
    const current = cycleTrends[cycleTrends.length - 1];
    const previous = cycleTrends[cycleTrends.length - 2];

    const makeComparison = (title: string, currVal: number | null, prevVal: number | null) => {
      const diff = currVal !== null && prevVal !== null ? Number((currVal - prevVal).toFixed(2)) : null;
      return { title, currVal, prevVal, diff };
    };

    return {
      current,
      previous,
      metrics: [
        makeComparison('Média Geral da Clínica', current.overallAvg, previous.overallAvg),
        makeComparison('Avaliação de Líderes', current.leadershipAvg, previous.leadershipAvg),
        makeComparison('Avaliação da Equipe', current.teamAvg, previous.teamAvg),
        makeComparison('Autoavaliação', current.selfAvg, previous.selfAvg),
      ],
    };
  }, [cycleTrends]);

  // Médias por setor no ciclo selecionado (ou no mais recente)
  const targetCycleId = activeCycleId || sortedCycles[sortedCycles.length - 1]?.id;

  const departmentMetrics = useMemo(() => {
    if (!targetCycleId) return [];
    const cycleEvals = data.evaluations.filter(e => e.cycleId === targetCycleId);
    const evalIds = new Set(cycleEvals.map(e => e.id));
    const cycleResponses = data.responses.filter(r => evalIds.has(r.evaluationId));

    return departments.map(dept => {
      const empsInDept = new Set(data.employees.filter(e => e.department === dept).map(e => e.id));
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

  // Resumo de engajamento do ciclo ativo
  const cycleSummary = useMemo(() => {
    if (!targetCycleId) return { responsesCount: 0, average: null, evaluatedDepts: 0, totalDepts: departmentMetrics.length };
    const cycleEvals = data.evaluations.filter(e => e.cycleId === targetCycleId);
    const evalIds = new Set(cycleEvals.map(e => e.id));
    const cycleResponses = data.responses.filter(r => evalIds.has(r.evaluationId));
    const scores = cycleResponses.map(responseAverage).filter((v): v is number => v !== null && !isNaN(v));
    const avg = scores.length ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : null;
    const evaluatedDepts = departmentMetrics.filter(d => d.average !== null).length;
    return {
      responsesCount: cycleResponses.length,
      average: avg,
      evaluatedDepts,
      totalDepts: departmentMetrics.length,
    };
  }, [targetCycleId, data.evaluations, data.responses, departmentMetrics]);

  // Dimensões do gráfico SVG de evolução
  const svgWidth = 620;
  const svgHeight = 220;
  const paddingX = 60;
  const paddingY = 32;

  const getY = (val: number) => {
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

  const validPoints = activeTrendPoints.filter(p => p.y !== null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26, marginTop: 10 }}>

      {/* BLOCO 1: Comparativo Direto entre Ciclos (Outubro vs. Novembro) */}
      {cycleComparison && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '24px 26px',
          boxShadow: '0 4px 14px rgba(15,23,42,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0284c7', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <Sparkles size={16} /> Comparativo de Desempenho
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
                Comparação: {cycleComparison.previous.name} ➔ {cycleComparison.current.name}
              </h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                Evolução das notas por perspectiva na escala oficial da Cardiofitness (1 a 4).
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', padding: '6px 14px', borderRadius: 20, border: '1px solid #e2e8f0', fontSize: 12, color: '#475569' }}>
              <CalendarDays size={15} color="#0284c7" />
              <span>Base oficial de <b>{data.responses.length}</b> respostas auditadas</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
            {cycleComparison.metrics.map(metric => {
              const hasCurr = metric.currVal !== null;
              const hasPrev = metric.prevVal !== null;
              const diff = metric.diff;
              const isPositive = diff !== null && diff > 0;
              const isNegative = diff !== null && diff < 0;
              const isNeutral = diff !== null && diff === 0;

              return (
                <div
                  key={metric.title}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{metric.title}</span>

                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: 28, fontWeight: 850, color: hasCurr ? (metric.currVal! < 3 ? '#b91c1c' : '#047857') : '#94a3b8' }}>
                      {hasCurr ? metric.currVal!.toFixed(2) : (hasPrev ? metric.prevVal!.toFixed(2) : '—')}
                      <small style={{ fontSize: 14, fontWeight: 500, color: '#64748b', marginLeft: 4 }}>/ 4.0</small>
                    </strong>

                    {diff !== null ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          fontSize: 12,
                          fontWeight: 750,
                          padding: '4px 9px',
                          borderRadius: 20,
                          background: isPositive ? '#ecfdf5' : isNegative ? '#fef2f2' : '#f1f5f9',
                          color: isPositive ? '#047857' : isNegative ? '#b91c1c' : '#475569',
                          border: `1px solid ${isPositive ? '#a7f3d0' : isNegative ? '#fecaca' : '#cbd5e1'}`,
                        }}
                      >
                        {isPositive ? <ArrowUpRight size={14} /> : isNegative ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                        {isPositive ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#0284c7', background: '#e0f2fe', padding: '3px 8px', borderRadius: 12, fontWeight: 600 }}>
                        {hasCurr ? 'Ciclo Atual' : 'Histórico Outubro'}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 11, color: '#64748b', borderTop: '1px solid #eef2f6', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{cycleComparison.previous.name}: <b>{hasPrev ? metric.prevVal!.toFixed(2) : '—'}</b></span>
                    <span>{cycleComparison.current.name}: <b>{hasCurr ? metric.currVal!.toFixed(2) : 'Em coleta'}</b></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BLOCO 2: Gráfico Histórico SVG com Filtro de Perspectiva */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: '24px 26px',
        boxShadow: '0 4px 14px rgba(15,23,42,0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0284c7', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <TrendingUp size={16} /> Linha de Tendência Temporal
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '4px 0 4px' }}>
              Evolução Ciclo a Ciclo
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Curva de desempenho calculada a partir de todas as avaliações identificadas.
            </p>
          </div>

          {/* Filtro de Perspectiva */}
          <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 10, border: '1px solid #e2e8f0' }}>
            {[
              { id: 'all', label: 'Média Geral' },
              { id: 'leadership', label: 'Liderança' },
              { id: 'team', label: 'Equipe' },
              { id: 'self', label: 'Autoavaliação' },
            ].map(btn => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setSelectedPerspective(btn.id)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: selectedPerspective === btn.id ? 750 : 550,
                  border: 'none',
                  cursor: 'pointer',
                  background: selectedPerspective === btn.id ? '#0284c7' : 'transparent',
                  color: selectedPerspective === btn.id ? '#ffffff' : '#475569',
                  boxShadow: selectedPerspective === btn.id ? '0 2px 6px rgba(2,132,199,0.25)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Gráfico SVG com Gradiente Moderno */}
        <div style={{ marginTop: 22, width: '100%', overflowX: 'auto' }}>
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{ width: '100%', maxHeight: 220, overflow: 'visible', background: '#fbfcfd', borderRadius: 12, border: '1px solid #edf2f7' }}
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Linhas de Grade e Valores da Escala */}
            {[1, 2, 3, 4].map(score => {
              const y = getY(score);
              return (
                <g key={score}>
                  <line x1={paddingX - 10} y1={y} x2={svgWidth - paddingX + 10} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <text x={paddingX - 22} y={y + 4} fontSize="11" fill="#94a3b8" fontWeight="600" textAnchor="end">
                    {score}.0
                  </text>
                </g>
              );
            })}

            {/* Área com preenchimento degradê moderno */}
            {validPoints.length > 1 && (
              <polygon
                points={`
                  ${validPoints[0].x},${svgHeight - paddingY}
                  ${validPoints.map(p => `${p.x},${p.y}`).join(' ')}
                  ${validPoints[validPoints.length - 1].x},${svgHeight - paddingY}
                `}
                fill="url(#areaGradient)"
              />
            )}

            {/* Linha de Conexão dos Pontos */}
            {validPoints.length > 1 && (
              <path
                d={validPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                fill="none"
                stroke="#0284c7"
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
                  <line x1={p.x} y1={p.y} x2={p.x} y2={svgHeight - paddingY} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2 2" />
                  <circle cx={p.x} cy={p.y} r="8" fill="#ffffff" stroke="#0284c7" strokeWidth="3" />
                  <circle cx={p.x} cy={p.y} r="3.5" fill="#0284c7" />

                  {/* Valor numérico em badge sobre o ponto */}
                  <rect x={p.x - 22} y={p.y - 30} width="44" height="20" rx="6" fill="#0f172a" />
                  <text x={p.x} y={p.y - 16} fontSize="11" fontWeight="800" fill="#ffffff" textAnchor="middle">
                    {p.value.toFixed(2)}
                  </text>

                  {/* Nome do ciclo no eixo X */}
                  <text x={p.x} y={svgHeight - 10} fontSize="11" fill="#334155" fontWeight="700" textAnchor="middle">
                    {p.cycleName}
                  </text>
                </g>
              );
            })}

            {!activeTrendPoints.some(p => p.value !== null) && (
              <text x={svgWidth / 2} y={svgHeight / 2} textAnchor="middle" fill="#94a3b8" fontSize="13">
                Aguardando respostas para calcular a média desta perspectiva.
              </text>
            )}
          </svg>
        </div>
      </div>

      {/* BLOCO 3: Distribuição de Notas & Cobertura do Ciclo (2 Colunas Perfeitamente Simétricas) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 24 }}>

        {/* COLUNA 1: Distribuição de Notas da Clínica (1 a 4) */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '24px 26px',
          boxShadow: '0 4px 14px rgba(15,23,42,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0284c7', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  <Award size={16} /> Distribuição Geral
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '4px 0 0' }}>
                  Proporção das Notas
                </h3>
              </div>
              <span style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: 12, fontWeight: 600 }}>
                {scoreDistribution.total} respostas
              </span>
            </div>

            {/* Barra Segmentada 100% Contínua */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ height: 14, width: '100%', borderRadius: 8, overflow: 'hidden', display: 'flex', background: '#e2e8f0' }}>
                {scoreDistribution.percentages[4] > 0 && (
                  <div style={{ width: `${scoreDistribution.percentages[4]}%`, background: '#10b981' }} title={`Supera: ${scoreDistribution.percentages[4]}%`} />
                )}
                {scoreDistribution.percentages[3] > 0 && (
                  <div style={{ width: `${scoreDistribution.percentages[3]}%`, background: '#0284c7' }} title={`Atende: ${scoreDistribution.percentages[3]}%`} />
                )}
                {scoreDistribution.percentages[2] > 0 && (
                  <div style={{ width: `${scoreDistribution.percentages[2]}%`, background: '#f59e0b' }} title={`Em desenvolvimento: ${scoreDistribution.percentages[2]}%`} />
                )}
                {scoreDistribution.percentages[1] > 0 && (
                  <div style={{ width: `${scoreDistribution.percentages[1]}%`, background: '#ef4444' }} title={`Precisa melhorar: ${scoreDistribution.percentages[1]}%`} />
                )}
              </div>
            </div>

            {/* Cards Coloridos com as 4 Faixas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {[
                { val: 4, label: 'Supera', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
                { val: 3, label: 'Atende', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
                { val: 2, label: 'Em desenvolvimento', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
                { val: 1, label: 'Precisa melhorar', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
              ].map(col => {
                const count = scoreDistribution.counts[col.val as 1 | 2 | 3 | 4];
                const pct = scoreDistribution.percentages[col.val as 1 | 2 | 3 | 4];

                return (
                  <div
                    key={col.val}
                    style={{
                      background: col.bg,
                      border: `1px solid ${col.border}`,
                      borderRadius: 12,
                      padding: '16px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: col.color }}>Nota {col.val}</span>
                      <b style={{ fontSize: 18, color: '#0f172a', fontWeight: 850 }}>{pct}%</b>
                    </div>
                    <strong style={{ fontSize: 12, color: '#1e293b' }}>{col.label}</strong>
                    <small style={{ fontSize: 11, color: '#64748b' }}>
                      {count} {count === 1 ? 'ocorrência' : 'ocorrências'}
                    </small>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 20, padding: '12px 14px', background: '#f8fafc', borderRadius: 10, fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #edf2f7' }}>
            <CheckCircle2 size={16} color="#0284c7" />
            <span>Distribuição acumulada de todas as respostas registradas.</span>
          </div>
        </div>

        {/* COLUNA 2: Resumo e Cobertura do Ciclo Atual */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '24px 26px',
          boxShadow: '0 4px 14px rgba(15,23,42,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0284c7', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  <TrendingUp size={16} /> Engajamento do Ciclo
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '4px 0 0' }}>
                  Cobertura & Participação
                </h3>
              </div>
              <span style={{ fontSize: 11, color: '#0284c7', background: '#e0f2fe', padding: '4px 10px', borderRadius: 12, fontWeight: 750 }}>
                {cycleComparison?.current?.name || 'Ciclo Ativo'}
              </span>
            </div>

            {/* Barra de Progresso de Cobertura de Setores */}
            <div style={{ marginBottom: 18 }}>
              {(() => {
                const sectorCoveragePct = cycleSummary.totalDepts > 0
                  ? Math.round((cycleSummary.evaluatedDepts / cycleSummary.totalDepts) * 100)
                  : 0;
                return (
                  <div style={{ height: 14, width: '100%', borderRadius: 8, overflow: 'hidden', display: 'flex', background: '#e2e8f0' }}>
                    <div
                      style={{
                        width: `${Math.max(5, sectorCoveragePct)}%`,
                        background: 'linear-gradient(90deg, #0284c7, #10b981)',
                        borderRadius: 8,
                        transition: 'width 0.4s ease',
                      }}
                      title={`Cobertura dos setores: ${sectorCoveragePct}%`}
                    />
                  </div>
                );
              })()}
            </div>

            {/* 4 Cards de Métricas do Ciclo (Simétricos aos 4 Cards da Esquerda) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#0284c7' }}>Média Geral</span>
                  <b style={{ fontSize: 18, color: '#0f172a', fontWeight: 850 }}>
                    {cycleSummary.average !== null ? cycleSummary.average.toFixed(2) : '—'}
                  </b>
                </div>
                <strong style={{ fontSize: 12, color: '#1e293b' }}>Escala 1 a 4</strong>
                <small style={{ fontSize: 11, color: '#64748b' }}>Notas do ciclo</small>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#10b981' }}>Respostas</span>
                  <b style={{ fontSize: 18, color: '#0f172a', fontWeight: 850 }}>
                    {cycleSummary.responsesCount}
                  </b>
                </div>
                <strong style={{ fontSize: 12, color: '#1e293b' }}>Submissões</strong>
                <small style={{ fontSize: 11, color: '#64748b' }}>Entradas computadas</small>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#6366f1' }}>Setores</span>
                  <b style={{ fontSize: 18, color: '#0f172a', fontWeight: 850 }}>
                    {cycleSummary.evaluatedDepts}/{cycleSummary.totalDepts}
                  </b>
                </div>
                <strong style={{ fontSize: 12, color: '#1e293b' }}>Cobertura</strong>
                <small style={{ fontSize: 11, color: '#64748b' }}>Setores com notas</small>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b' }}>Equipe Ativa</span>
                  <b style={{ fontSize: 18, color: '#0f172a', fontWeight: 850 }}>
                    {data.employees.filter(e => e.active).length}
                  </b>
                </div>
                <strong style={{ fontSize: 12, color: '#1e293b' }}>Colaboradores</strong>
                <small style={{ fontSize: 11, color: '#64748b' }}>Cadastrados no RH</small>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, padding: '12px 14px', background: '#f8fafc', borderRadius: 10, fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #edf2f7' }}>
            <CheckCircle2 size={16} color="#10b981" />
            <span>Métricas oficiais em tempo real do portal Cardiofitness.</span>
          </div>
        </div>

      </div>

      {/* BLOCO 4: Média por Setor da Clínica (Grid Multi-colunas de Largura Total) */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: '24px 26px',
        boxShadow: '0 4px 14px rgba(15,23,42,0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0284c7', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <Layers size={16} /> Desempenho por Departamento
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
              Média por Setor da Clínica
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Visão completa de todos os {departmentMetrics.length} setores cadastrados na Cardiofitness.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#64748b', background: '#f1f5f9', padding: '6px 12px', borderRadius: 12, fontWeight: 600 }}>
              Escala 1.0 a 4.0
            </span>
          </div>
        </div>

        {/* Grid Responsivo de Cards de Setores */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {departmentMetrics.map((dept, index) => {
            const theme = getDeptTheme(dept.department, index);
            const val = dept.average ?? 0;
            const pct = val ? Math.min(100, Math.max(0, ((val - 1) / 3) * 100)) : 0;
            const hasScore = dept.average !== null;

            return (
              <div
                key={dept.department}
                style={{
                  background: theme.bg,
                  border: `1px solid ${theme.bar}30`,
                  borderRadius: 12,
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  transition: 'transform 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <b style={{ fontSize: 13, color: '#0f172a', letterSpacing: '0.01em', lineHeight: 1.35 }}>
                      {dept.department.toLocaleUpperCase('pt-BR')}
                    </b>
                    {hasScore ? (
                      <span style={{
                        background: '#ffffff',
                        border: `1px solid ${dept.average! < 3 ? '#fca5a5' : '#86efac'}`,
                        borderRadius: 8,
                        padding: '2px 8px',
                        fontWeight: 850,
                        fontSize: 14,
                        color: dept.average! < 3 ? '#b91c1c' : '#047857',
                        whiteSpace: 'nowrap',
                      }}>
                        {dept.average!.toFixed(2)} <small style={{ fontSize: 10, color: '#64748b' }}>/ 4.0</small>
                      </span>
                    ) : (
                      <span style={{
                        background: '#f1f5f9',
                        borderRadius: 8,
                        padding: '2px 8px',
                        fontWeight: 600,
                        fontSize: 11,
                        color: '#94a3b8',
                        whiteSpace: 'nowrap',
                      }}>
                        Em coleta
                      </span>
                    )}
                  </div>

                  {/* Barra de Progresso */}
                  {hasScore ? (
                    <div style={{ height: 8, width: '100%', background: '#ffffff', borderRadius: 6, overflow: 'hidden', border: `1px solid ${dept.average! < 3 ? '#fca5a5' : '#86efac'}`, marginTop: 6 }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: dept.average! < 3 ? '#ef4444' : '#10b981',
                          borderRadius: 6,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{ height: 8, width: '100%', background: '#ffffff50', borderRadius: 6, overflow: 'hidden', border: '1px dashed #cbd5e1', marginTop: 6 }} />
                  )}
                </div>

                <div style={{ fontSize: 11, color: '#64748b', display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${theme.bar}20`, paddingTop: 8 }}>
                  <span>{dept.headcount} {dept.headcount === 1 ? 'colaborador' : 'colaboradores'}</span>
                  <b>{dept.responsesCount} {dept.responsesCount === 1 ? 'avaliação' : 'avaliações'}</b>
                </div>
              </div>
            );
          })}

          {!departmentMetrics.length && (
            <p style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic', textAlign: 'center', margin: '20px 0', gridColumn: '1 / -1' }}>
              Nenhum departamento cadastrado neste ciclo.
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
