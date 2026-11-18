'use client';

import { Suspense, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  HeartPulse,
  LoaderCircle,
  Lock,
  Send,
  ShieldCheck,
  User,
  UsersRound,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { cycleState, formatDate } from '@/lib/analytics';
import type { Employee, EvaluationKind, ScoreQuestion } from '@/lib/types';
import styles from '@/components/native-prototype.module.css';

const SCALE_LABELS: Record<number, string> = {
  1: 'Precisa melhorar',
  2: 'Em desenvolvimento',
  3: 'Atende',
  4: 'Supera',
};

// Perguntas por setor, espelhando exatamente o Google Forms oficial
const SECTOR_QUESTIONS: Record<string, ScoreQuestion[]> = {
  'Faturamento': [
    { id: 'q1', title: 'O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?', min: 1, max: 4 },
    { id: 'q2', title: 'O funcionário tem conhecimento amplo dos convênios que fatura/autoriza?', min: 1, max: 4 },
    { id: 'q3', title: 'Passa as informações necessárias para seu grupo de trabalho?', min: 1, max: 4 },
    { id: 'q4', title: 'Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?', min: 1, max: 4 },
    { id: 'q5', title: 'O funcionário tem domínio do software MedWare?', min: 1, max: 4 },
    { id: 'q6', title: 'O funcionário tem domínio dos sites dos convênios que fatura/autoriza?', min: 1, max: 4 },
    { id: 'q7', title: 'O funcionário reflete os valores da empresa?', min: 1, max: 4 },
  ],
  'Central e Resultados': [
    { id: 'q1', title: 'O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?', min: 1, max: 4 },
    { id: 'q2', title: 'O funcionário tem conhecimento dos convênios credenciados, consultas, exames e respectivos valores?', min: 1, max: 4 },
    { id: 'q3', title: 'Passa as informações necessárias para seu grupo de trabalho?', min: 1, max: 4 },
    { id: 'q4', title: 'Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?', min: 1, max: 4 },
    { id: 'q5', title: 'O funcionário tem domínio do software MedWare?', min: 1, max: 4 },
    { id: 'q6', title: 'O funcionário tem domínio do software da Fasterisks?', min: 1, max: 4 },
    { id: 'q7', title: 'O funcionário reflete os valores da empresa?', min: 1, max: 4 },
  ],
  'Recepção e Triagem': [
    { id: 'q1', title: 'O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?', min: 1, max: 4 },
    { id: 'q2', title: 'O funcionário tem conhecimento dos convênios credenciados, consultas, exames e respectivos valores? O funcionário tem conhecimento técnico dos exames da empresa?', min: 1, max: 4 },
    { id: 'q3', title: 'Passa as informações necessárias para seu grupo de trabalho?', min: 1, max: 4 },
    { id: 'q4', title: 'Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?', min: 1, max: 4 },
    { id: 'q5', title: 'O funcionário tem domínio do software MedWare?', min: 1, max: 4 },
    { id: 'q6', title: 'O funcionário reflete os valores da empresa?', min: 1, max: 4 },
  ],
  'Técnicas e Corredor / Copeiras': [
    { id: 'q1', title: 'O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?', min: 1, max: 4 },
    { id: 'q2', title: 'O funcionário tem conhecimento técnico dos exames da empresa?', min: 1, max: 4 },
    { id: 'q3', title: 'Passa as informações necessárias para seu grupo de trabalho?', min: 1, max: 4 },
    { id: 'q4', title: 'Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?', min: 1, max: 4 },
    { id: 'q5', title: 'O funcionário tem domínio do software MedWare?', min: 1, max: 4 },
    { id: 'q6', title: 'O funcionário reflete os valores da empresa?', min: 1, max: 4 },
  ],
  'Administrativo': [
    { id: 'q1', title: 'O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?', min: 1, max: 4 },
    { id: 'q2', title: 'O funcionário tem desempenhado bem sua função?', min: 1, max: 4 },
    { id: 'q3', title: 'Passa as informações necessárias para seu grupo de trabalho?', min: 1, max: 4 },
    { id: 'q4', title: 'Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?', min: 1, max: 4 },
    { id: 'q5', title: 'O funcionário reflete os valores da empresa?', min: 1, max: 4 },
  ],
};

// fallback genérico (nunca deveria aparecer se todos os setores estiverem mapeados)
const DEFAULT_TEAM_QUESTIONS: ScoreQuestion[] = SECTOR_QUESTIONS['Administrativo'];

function TeamEvaluationContent() {
  const { data, status, submitResponse } = useApp();

  const [respondentId, setRespondentId] = useState('');
  const [evaluationMode, setEvaluationMode] = useState<'self' | 'peer' | 'subordinate'>('self');
  const [selectedPeerId, setSelectedPeerId] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [observation, setObservation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Identifica ciclo em andamento
  const activeCycle = useMemo(() => {
    return data.cycles.find(c => cycleState(c) === 'Em andamento');
  }, [data.cycles]);

  const lastClosedCycle = useMemo(() => {
    const closed = data.cycles.filter(c => cycleState(c) === 'Encerrado');
    return closed.sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
  }, [data.cycles]);

  const activeEmployees = useMemo(() => {
    return data.employees.filter(e => e.active).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [data.employees]);

  const respondent = useMemo(() => {
    return activeEmployees.find(e => e.id === respondentId);
  }, [activeEmployees, respondentId]);

  // Colegas do mesmo setor para avaliação entre pares
  const peersInDepartment = useMemo(() => {
    if (!respondent) return [];
    return activeEmployees.filter(e => e.department === respondent.department && e.id !== respondent.id && !e.isLeader);
  }, [activeEmployees, respondent]);

  // Liderados (caso o respondente seja um líder)
  const subordinates = useMemo(() => {
    if (!respondent || !respondent.isLeader) return [];
    return activeEmployees.filter(e => e.leaderId === respondent.id);
  }, [activeEmployees, respondent]);

  // Sujeito da avaliação (quem está sendo avaliado)
  const targetSubject = useMemo((): Employee | undefined => {
    if (!respondent) return undefined;
    if (evaluationMode === 'self') return respondent;
    if (evaluationMode === 'peer') return peersInDepartment.find(p => p.id === selectedPeerId);
    if (evaluationMode === 'subordinate') return subordinates.find(s => s.id === selectedPeerId);
    return undefined;
  }, [respondent, evaluationMode, selectedPeerId, peersInDepartment, subordinates]);

  const targetKind: EvaluationKind = useMemo(() => {
    if (evaluationMode === 'self') return 'self';
    if (evaluationMode === 'subordinate') return 'leader_to_employee';
    return 'team';
  }, [evaluationMode]);

  // Avaliação correspondente do ciclo
  const evaluationObj = useMemo(() => {
    if (!activeCycle) return undefined;
    return (
      data.evaluations.find(e => e.cycleId === activeCycle.id && e.kind === 'team') ||
      data.evaluations.find(e => e.cycleId === activeCycle.id)
    );
  }, [activeCycle, data.evaluations]);

  const questions: ScoreQuestion[] = useMemo(() => {
    if (evaluationObj?.mapping?.scoreQuestions?.length) {
      return evaluationObj.mapping.scoreQuestions;
    }
    if (respondent) {
      return SECTOR_QUESTIONS[respondent.department] ?? DEFAULT_TEAM_QUESTIONS;
    }
    return DEFAULT_TEAM_QUESTIONS;
  }, [evaluationObj, respondent]);

  const isFormComplete = useMemo(() => {
    if (!respondent || !targetSubject || !questions.length) return false;
    return questions.every(q => scores[q.id] >= 1 && scores[q.id] <= 4);
  }, [respondent, targetSubject, questions, scores]);

  function handleRespondentChange(id: string) {
    setRespondentId(id);
    setSelectedPeerId('');
    setEvaluationMode('self');
    setScores({});
    setObservation('');
    setSubmitted(false);
    setErrorMessage('');
  }

  function handleModeChange(mode: 'self' | 'peer' | 'subordinate') {
    setEvaluationMode(mode);
    setSelectedPeerId('');
    setScores({});
    setObservation('');
    setSubmitted(false);
    setErrorMessage('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCycle || !evaluationObj || !respondent || !targetSubject || !isFormComplete || submitting) {
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    try {
      await submitResponse({
        evaluationId: evaluationObj.id,
        respondentId: respondent.id,
        subjectId: targetSubject.id,
        kind: targetKind,
        scores,
        textAnswers: observation.trim()
          ? [{ questionId: 'feedback', question: 'Observações de desempenho', answer: observation.trim() }]
          : [],
      });
      setSubmitted(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Não foi possível enviar a avaliação.');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className={styles.portal} style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <LoaderCircle size={40} className="spin" style={{ color: 'var(--blue)', margin: '0 auto 16px' }} />
          <h2>Carregando formulário...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.portal}>
      {/* Sidebar de Marca e Informações */}
      <aside className={styles.portalAside}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}><HeartPulse size={24} /></span>
          <span>Cardiofitness <small>Gestão de Pessoas</small></span>
        </div>

        <div className={styles.asideCenter}>
          <div className={styles.asideEyebrow}>FORMULÁRIO OFICIAL 2</div>
          <h1>Avaliação e Autoavaliação da Equipe</h1>
          <p>
            Espaço para reflexão do próprio desempenho (autoavaliação) e avaliação da colaboração entre os colegas do mesmo setor.
          </p>

          <div className={styles.asidePill}>
            <ShieldCheck size={16} />
            <span>Escala oficial de 1 a 4 · Respostas computadas pelo RH</span>
          </div>
        </div>

        <div className={styles.asideFooter}>
          © {new Date().getFullYear()} Cardiofitness · Cardiologia e Medicina Preventiva
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className={styles.portalMain}>
        <div className={styles.topLinks} style={{ justifyContent: 'flex-end' }}>
          <span className={styles.previewChip}>
            {activeCycle ? `Ciclo Ativo: ${activeCycle.name}` : 'Sem Ciclo Ativo'}
          </span>
        </div>

        <div className={styles.formShell} style={{ maxWidth: 720 }}>
          {/* Caso 1: Sem ciclo ativo ou ciclo encerrado */}
          {!activeCycle ? (
            <div style={{ background: '#fff', border: '1px solid #fee4e2', borderRadius: 16, padding: '40px 32px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef3f2', color: '#b42318', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
                <Lock size={30} />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#101828', marginBottom: 10 }}>
                Período de Avaliação Encerrado
              </h2>
              <p style={{ color: '#475467', fontSize: 15, lineHeight: 1.6, maxWidth: 480, margin: '0 auto 24px' }}>
                Não há ciclo de avaliação ativo no momento. As avaliações só podem ser preenchidas durante o período oficial definido pelo RH da Cardiofitness.
              </p>
              {lastClosedCycle && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f8fafc', padding: '10px 18px', borderRadius: 8, fontSize: 13, color: '#64748b' }}>
                  <Clock size={16} />
                  <span>Último período encerrado em <b>{formatDate(lastClosedCycle.endDate)}</b> ({lastClosedCycle.name})</span>
                </div>
              )}
            </div>
          ) : submitted ? (
            /* Caso 2: Avaliação enviada com sucesso */
            <div style={{ background: '#fff', border: '1px solid #d1fae5', borderRadius: 16, padding: '48px 32px', textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
                <CheckCircle2 size={38} />
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: '#065f46', marginBottom: 12 }}>
                Avaliação enviada com sucesso!
              </h2>
              <p style={{ color: '#047857', fontSize: 15, lineHeight: 1.6, maxWidth: 500, margin: '0 auto 28px' }}>
                O envio sobre <b>{targetSubject?.name}</b> foi registrado e computado com sucesso no <b>{activeCycle.name}</b>.
              </p>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => {
                    setSubmitted(false);
                    setScores({});
                    setObservation('');
                  }}
                >
                  Enviar outra avaliação
                </button>
              </div>
            </div>
          ) : (
            /* Caso 3: Formulário ativo */
            <form onSubmit={handleSubmit}>
              {/* Banner do Ciclo */}
              <div style={{ background: '#f0f7fd', border: '1px solid #c5def1', borderRadius: 12, padding: '16px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <b style={{ color: '#0573b9', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CalendarDays size={18} /> {activeCycle.name}
                  </b>
                  <span style={{ fontSize: 13, color: '#475467', display: 'block', marginTop: 2 }}>
                    Período aberto até <b>{formatDate(activeCycle.endDate)}</b>
                  </span>
                </div>
                <span style={{ background: '#ecfdf5', color: '#067647', border: '1px solid #a6f4c5', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  ● Aberto para respostas
                </span>
              </div>

              {/* Bloco 1: Seleção de quem está respondendo */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '24px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <label className={styles.fieldLabel} style={{ fontSize: 15, color: '#0f172a', marginBottom: 6 }}>
                  1. Quem está respondendo? (Selecione seu nome) *
                </label>
                <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 14px' }}>
                  Identifique-se para carregar sua autoavaliação e os colegas do seu setor.
                </p>

                <select
                  className={styles.input}
                  style={{ fontSize: 15, fontWeight: 500 }}
                  value={respondentId}
                  onChange={e => handleRespondentChange(e.target.value)}
                  required
                >
                  <option value="">-- Selecione seu nome na lista --</option>
                  {activeEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>

                {/* Opções de modalidade quando selecionado */}
                {respondent && (
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
                      2. O que você deseja preencher agora? *
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
                      {/* Opção Autoavaliação */}
                      <button
                        type="button"
                        onClick={() => handleModeChange('self')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '14px 16px',
                          borderRadius: 10,
                          border: `2px solid ${evaluationMode === 'self' ? '#0573b9' : '#e2e8f0'}`,
                          background: evaluationMode === 'self' ? '#f0f7fd' : '#fff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontWeight: evaluationMode === 'self' ? 700 : 500,
                          color: evaluationMode === 'self' ? '#0573b9' : '#334155',
                        }}
                      >
                        <User size={18} />
                        <div>
                          <span style={{ display: 'block', fontSize: 13 }}>Minha Autoavaliação</span>
                          <small style={{ fontSize: 11, opacity: 0.7 }}>Avaliar a mim mesmo</small>
                        </div>
                      </button>

                      {/* Opção Colega do Setor */}
                      {peersInDepartment.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleModeChange('peer')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '14px 16px',
                            borderRadius: 10,
                            border: `2px solid ${evaluationMode === 'peer' ? '#0573b9' : '#e2e8f0'}`,
                            background: evaluationMode === 'peer' ? '#f0f7fd' : '#fff',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontWeight: evaluationMode === 'peer' ? 700 : 500,
                            color: evaluationMode === 'peer' ? '#0573b9' : '#334155',
                          }}
                        >
                          <UsersRound size={18} />
                          <div>
                            <span style={{ display: 'block', fontSize: 13 }}>Colega de Equipe</span>
                            <small style={{ fontSize: 11, opacity: 0.7 }}>Avaliar colega do setor</small>
                          </div>
                        </button>
                      )}

                      {/* Opção Liderado (caso seja líder) */}
                      {subordinates.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleModeChange('subordinate')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '14px 16px',
                            borderRadius: 10,
                            border: `2px solid ${evaluationMode === 'subordinate' ? '#0573b9' : '#e2e8f0'}`,
                            background: evaluationMode === 'subordinate' ? '#f0f7fd' : '#fff',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontWeight: evaluationMode === 'subordinate' ? 700 : 500,
                            color: evaluationMode === 'subordinate' ? '#0573b9' : '#334155',
                          }}
                        >
                          <UsersRound size={18} />
                          <div>
                            <span style={{ display: 'block', fontSize: 13 }}>Colaborador Liderado</span>
                            <small style={{ fontSize: 11, opacity: 0.7 }}>Avaliação como líder</small>
                          </div>
                        </button>
                      )}
                    </div>

                    {/* Seleção do colega quando modalidade é 'peer' */}
                    {evaluationMode === 'peer' && (
                      <div style={{ marginTop: 12, padding: '14px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                          Selecione qual colega você vai avaliar: *
                        </label>
                        <select
                          className={styles.input}
                          value={selectedPeerId}
                          onChange={e => setSelectedPeerId(e.target.value)}
                          required
                        >
                          <option value="">-- Escolha o colega --</option>
                          {peersInDepartment.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Seleção do liderado quando modalidade é 'subordinate' */}
                    {evaluationMode === 'subordinate' && (
                      <div style={{ marginTop: 12, padding: '14px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                          Selecione qual colaborador da sua equipe você vai avaliar: *
                        </label>
                        <select
                          className={styles.input}
                          value={selectedPeerId}
                          onChange={e => setSelectedPeerId(e.target.value)}
                          required
                        >
                          <option value="">-- Escolha o colaborador --</option>
                          {subordinates.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bloco 2: Perguntas de Avaliação */}
              {respondent && targetSubject && (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                      3. Questões de Desempenho
                    </h3>
                    <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                      {evaluationMode === 'self' ? (
                        <>Reflita sobre suas próprias entregas e comportamento no setor <b>{respondent.department}</b>.</>
                      ) : (
                        <>Avalie o desempenho e a cooperação de <b>{targetSubject.name}</b> no setor <b>{targetSubject.department}</b>.</>
                      )}
                    </p>
                  </div>

                  <div className={styles.questions}>
                    {questions.map((q, idx) => (
                      <fieldset key={q.id} className={styles.questionCard}>
                        <legend>
                          <span className={styles.questionNumber}>Pergunta {idx + 1} de {questions.length}</span>
                          <br />
                          {q.title}
                        </legend>

                        <div className={styles.ratingOptions}>
                          {[1, 2, 3, 4].map(val => {
                            const isSelected = scores[q.id] === val;
                            return (
                              <label
                                key={val}
                                className={isSelected ? styles.selectedRating : styles.rating}
                              >
                                <input
                                  type="radio"
                                  name={`score-${q.id}`}
                                  value={val}
                                  checked={isSelected}
                                  onChange={() => setScores(prev => ({ ...prev, [q.id]: val }))}
                                  required
                                />
                                <b>{val}</b>
                                <small>{SCALE_LABELS[val]}</small>
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    ))}
                  </div>

                  {/* Bloco 3: Observações opcionais */}
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '24px', marginBottom: 24 }}>
                    <label className={styles.fieldLabel} style={{ fontSize: 14, color: '#0f172a' }}>
                      4. Observações e Pontos de Desenvolvimento (Opcional)
                    </label>
                    <textarea
                      className={styles.textarea}
                      placeholder={
                        evaluationMode === 'self'
                          ? 'Descreva aspectos em que deseja evoluir ou comentários sobre seu desempenho...'
                          : `Deixe comentários sobre o desempenho ou pontos de desenvolvimento de ${targetSubject.name.split(' ')[0]}...`
                      }
                      value={observation}
                      onChange={e => setObservation(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {errorMessage && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '14px 16px', borderRadius: 10, marginBottom: 20, fontSize: 14 }}>
                      {errorMessage}
                    </div>
                  )}

                  {/* Botão de Envio */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button
                      type="submit"
                      className={styles.primaryButton}
                      disabled={!isFormComplete || submitting}
                      style={{ minWidth: 260, height: 50, fontSize: 15 }}
                    >
                      {submitting ? (
                        <>
                          <LoaderCircle className="spin" size={18} /> Enviando...
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          {evaluationMode === 'self'
                            ? 'Enviar Minha Autoavaliação'
                            : `Enviar Avaliação de ${targetSubject.name.split(' ')[0]}`}
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default function TeamEvaluationPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Carregando...</div>}>
      <TeamEvaluationContent />
    </Suspense>
  );
}
