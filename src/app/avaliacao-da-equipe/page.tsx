'use client';

import { Suspense, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  HeartPulse,
  LoaderCircle,
  Lock,
  Send,
  ShieldCheck,
  User,
  UsersRound,
} from 'lucide-react';
import { usePublicForm } from '@/lib/use-public-form';
import { cycleState, formatDate } from '@/lib/analytics';
import { normalizeDepartment } from '@/lib/roster-data';
import type { Employee, EvaluationKind, ScoreQuestion } from '@/lib/types';
import styles from '@/components/native-prototype.module.css';

const SCALE_LABELS: Record<number, string> = {
  1: 'Precisa melhorar',
  2: 'Em desenvolvimento',
  3: 'Atende',
  4: 'Supera',
};

// Setores oficiais da Cardiofitness
const DEPARTMENTS = [
  'Faturamento',
  'Central e Resultados',
  'Recepção e Triagem',
  'Técnicas e Corredor / Copeiras',
  'Administrativo',
  'Suporte',
];

// Perguntas oficiais por setor
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
  'Suporte': [
    { id: 'q1', title: 'O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?', min: 1, max: 4 },
    { id: 'q2', title: 'O funcionário tem desempenhado bem sua função no suporte e rotinas técnicas?', min: 1, max: 4 },
    { id: 'q3', title: 'Passa as informações necessárias para seu grupo de trabalho?', min: 1, max: 4 },
    { id: 'q4', title: 'Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?', min: 1, max: 4 },
    { id: 'q5', title: 'O funcionário reflete os valores da empresa?', min: 1, max: 4 },
  ],
};

const DEFAULT_TEAM_QUESTIONS: ScoreQuestion[] = SECTOR_QUESTIONS['Administrativo'];

function TeamEvaluationContent() {
  const { cycle, employees, evaluations, loading, submitResponse } = usePublicForm('team');

  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [respondentId, setRespondentId] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [observation, setObservation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Identifica ciclo em andamento
  const activeCycle = useMemo(() => {
    if (!cycle) return undefined;
    return cycleState(cycle) === 'Em andamento' ? cycle : undefined;
  }, [cycle]);

  const activeEmployees = useMemo(() => {
    return employees.filter(e => e.active).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [employees]);

  // Colaboradores filtrados pelo setor selecionado
  const departmentEmployees = useMemo(() => {
    if (!selectedDepartment) return [];
    return activeEmployees.filter(e => normalizeDepartment(e.department) === selectedDepartment);
  }, [activeEmployees, selectedDepartment]);

  const respondent = useMemo(() => {
    return activeEmployees.find(e => e.id === respondentId);
  }, [activeEmployees, respondentId]);

  // Colegas do mesmo setor (excluindo a própria pessoa e excluindo a líder do setor para não líderes)
  const peersInDepartment = useMemo(() => {
    if (!respondent) return [];
    return departmentEmployees.filter(
      e => e.id !== respondent.id && (!e.isLeader || respondent.isLeader)
    );
  }, [departmentEmployees, respondent]);

  // Sujeito da avaliação (quem está sendo avaliado)
  const targetSubject = useMemo((): Employee | undefined => {
    if (!respondent || !selectedTargetId) return undefined;
    if (selectedTargetId === respondent.id) return respondent;
    return departmentEmployees.find(e => e.id === selectedTargetId);
  }, [respondent, selectedTargetId, departmentEmployees]);

  const targetKind: EvaluationKind = useMemo(() => {
    if (!respondent || !targetSubject) return 'team';
    if (targetSubject.id === respondent.id) return 'self';
    if (respondent.isLeader && targetSubject.leaderId === respondent.id) return 'leader_to_employee';
    return 'team';
  }, [respondent, targetSubject]);

  const evaluationObj = useMemo(() => {
    if (!activeCycle) return undefined;
    return (
      evaluations.find(e => e.cycleId === activeCycle.id && e.kind === 'team') ||
      evaluations.find(e => e.cycleId === activeCycle.id)
    );
  }, [activeCycle, evaluations]);

  const questions: ScoreQuestion[] = useMemo(() => {
    const dept = selectedDepartment || respondent?.department;
    if (dept && SECTOR_QUESTIONS[dept]) {
      return SECTOR_QUESTIONS[dept];
    }
    return DEFAULT_TEAM_QUESTIONS;
  }, [respondent, selectedDepartment]);

  const isFormComplete = useMemo(() => {
    if (!respondent || !targetSubject || !questions.length) return false;
    return questions.every(q => scores[q.id] >= 1 && scores[q.id] <= 4);
  }, [respondent, targetSubject, questions, scores]);

  function handleDepartmentChange(dept: string) {
    setSelectedDepartment(dept);
    setScores({});
    setObservation('');
    setSubmitted(false);
    setErrorMessage('');

    const deptEmps = activeEmployees.filter(e => normalizeDepartment(e.department) === dept);
    if (deptEmps.length === 1) {
      setRespondentId(deptEmps[0].id);
      setSelectedTargetId(deptEmps[0].id);
    } else {
      setRespondentId('');
      setSelectedTargetId('');
    }
  }

  function handleRespondentChange(id: string) {
    setRespondentId(id);
    setSelectedTargetId('');
    setScores({});
    setObservation('');
    setSubmitted(false);
    setErrorMessage('');
  }

  function handleTargetChange(targetId: string) {
    setSelectedTargetId(targetId);
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

  if (loading) {
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
          <div className={styles.asideEyebrow}>PORTAL DE AVALIAÇÕES</div>
          <h1>Avaliação e Autoavaliação da Equipe</h1>
          <p>
            Espaço para reflexão do próprio desempenho (autoavaliação) e avaliação da cooperação entre os colegas do seu setor.
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
                O envio sobre <b>{targetSubject?.name.toUpperCase()}</b> foi registrado com sucesso no <b>{activeCycle.name}</b>.
              </p>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => {
                    setSubmitted(false);
                    setScores({});
                    setObservation('');
                    setSelectedTargetId('');
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

              {/* Bloco 1: Seleção do Setor e do Nome */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '24px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                {/* 1. SELECIONE O SEU SETOR */}
                <div style={{ marginBottom: 20 }}>
                  <label className={styles.fieldLabel} style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8, display: 'block' }}>
                    1. Selecione o seu setor *
                  </label>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 10px' }}>
                    Escolha sua área para carregar apenas os colaboradores do seu setor.
                  </p>
                  <select
                    className={styles.input}
                    style={{ fontSize: 15, fontWeight: 600, color: selectedDepartment ? '#0f172a' : '#64748b' }}
                    value={selectedDepartment}
                    onChange={e => handleDepartmentChange(e.target.value)}
                    required
                  >
                    <option value="">-- Selecione seu setor --</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. SELECIONE O SEU NOME */}
                {selectedDepartment && (
                  <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #f1f5f9' }}>
                    <label className={styles.fieldLabel} style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8, display: 'block' }}>
                      2. Selecione o seu nome *
                    </label>
                    <select
                      className={styles.input}
                      style={{ fontSize: 15, fontWeight: 500 }}
                      value={respondentId}
                      onChange={e => handleRespondentChange(e.target.value)}
                      required
                    >
                      <option value="">-- ESCOLHA SEU NOME NA LISTA DO SETOR {selectedDepartment.toUpperCase()} --</option>
                      {departmentEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 3. QUEM VOCÊ VAI AVALIAR? */}
                {respondent && (
                  <div style={{ marginTop: 22, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
                    <label className={styles.fieldLabel} style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8, display: 'block' }}>
                      3. Quem você vai avaliar? *
                    </label>
                    <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 10px' }}>
                      Selecione a si mesmo para preencher sua autoavaliação ou selecione um colega do setor {selectedDepartment}.
                    </p>
                    <select
                      className={styles.input}
                      style={{ fontSize: 15, fontWeight: 500 }}
                      value={selectedTargetId}
                      onChange={e => handleTargetChange(e.target.value)}
                      required
                    >
                      <option value="">-- ESCOLHA QUEM VOCÊ VAI AVALIAR NO SETOR {selectedDepartment.toUpperCase()} --</option>
                      <option value={respondent.id}>
                        {respondent.name.toUpperCase()} (MINHA AUTOAVALIAÇÃO)
                      </option>
                      {peersInDepartment.map(peer => (
                        <option key={peer.id} value={peer.id}>
                          {peer.name.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Bloco 2: Perguntas de Avaliação */}
              {respondent && targetSubject && (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                      4. Questões de Desempenho — {selectedDepartment}
                    </h3>
                    <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                      {targetKind === 'self' ? (
                        <>Reflita sobre suas próprias atividades e entregas na área de <b>{selectedDepartment}</b>.</>
                      ) : (
                        <>Avalie a cooperação e desempenho de <b>{targetSubject.name.toUpperCase()}</b> no setor <b>{selectedDepartment}</b>.</>
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
                      5. Observações e Pontos de Desenvolvimento (Opcional)
                    </label>
                    <textarea
                      className={styles.textarea}
                      placeholder={
                        targetKind === 'self'
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
                          {targetKind === 'self'
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
