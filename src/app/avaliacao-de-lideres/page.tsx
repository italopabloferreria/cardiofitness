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
} from 'lucide-react';
import { usePublicForm } from '@/lib/use-public-form';
import { cycleState, formatDate } from '@/lib/analytics';
import { normalizeDepartment } from '@/lib/roster-data';
import type { Employee, ScoreQuestion } from '@/lib/types';
import styles from '@/components/native-prototype.module.css';

const SCALE_LABELS: Record<number, string> = {
  1: 'Precisa melhorar',
  2: 'Em desenvolvimento',
  3: 'Atende',
  4: 'Supera',
};

const DEPARTMENTS = [
  'Faturamento',
  'Central e Resultados',
  'Recepção e Triagem',
  'Técnicas e Corredor / Copeiras',
  'Administrativo',
];

interface LeaderSection {
  title: string;
  questions: ScoreQuestion[];
}

const LEADER_SECTIONS: LeaderSection[] = [
  {
    title: 'DESEMPENHO',
    questions: [
      {
        id: '1860caa3',
        title: 'O FUNCIONÁRIO FAZ UMA BOA GESTÃO DE TEMPO E CONSEGUE ENTREGAR SUAS ATIVIDADES DENTRO DO PRAZO?',
        min: 1,
        max: 4,
      },
      {
        id: '08d6ea80',
        title: 'O FUNCIONÁRIO TEM DESEMPENHADO BEM SUA FUNÇÃO?',
        min: 1,
        max: 4,
      },
    ],
  },
  {
    title: 'TRABALHO EM EQUIPE',
    questions: [
      {
        id: '3321e5a8',
        title: 'PASSA AS INFORMAÇÕES NECESSÁRIAS PARA SEU GRUPO DE TRABALHO?',
        min: 1,
        max: 4,
      },
      {
        id: '43bd2532',
        title: 'BUSCA O DIÁLOGO E A TROCA DE OPINIÕES NO GRUPO PARA QUE TODOS ENCONTREM JUNTOS A MELHOR SOLUÇÃO?',
        min: 1,
        max: 4,
      },
    ],
  },
  {
    title: 'LIDERANÇA',
    questions: [
      {
        id: '3bcd842e',
        title: 'CONSEGUE INFLUENCIAR OS DEMAIS COLABORADORES E MOTIVÁ-LOS A PARTICIPAR DAS ATIVIDADES PROPOSTAS?',
        min: 1,
        max: 4,
      },
      {
        id: '485e3858',
        title: 'ENTENDE A DIVERSIDADE DE PERSONALIDADES E CONSEGUE DESPERTAR O MELHOR DE CADA UMA?',
        min: 1,
        max: 4,
      },
    ],
  },
  {
    title: 'CULTURA',
    questions: [
      {
        id: '580fe4fc',
        title: 'O FUNCIONÁRIO REFLETE OS VALORES DA EMPRESA?',
        min: 1,
        max: 4,
      },
    ],
  },
];

const FORMS_LEADERS = [
  { displayName: 'LIDIA VIANA', searchKey: 'Lídia', defaultDepartment: 'Faturamento' },
  { displayName: 'CLEUMA', searchKey: 'Cleuma', defaultDepartment: 'Técnicas e Corredor / Copeiras' },
  { displayName: 'GABRIEL', searchKey: 'Gabriel', defaultDepartment: 'Central e Resultados' },
  { displayName: 'WELISSON', searchKey: 'Welisson', defaultDepartment: 'Recepção e Triagem' },
  { displayName: 'MARIA', searchKey: 'Maria Alzirene', defaultDepartment: 'Administrativo' },
];

function LeadershipEvaluationContent() {
  const { cycle, employees, evaluations, loading, submitResponse } = usePublicForm('leadership');

  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [respondentId, setRespondentId] = useState('');
  const [selectedLeaderId, setSelectedLeaderId] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [observation, setObservation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const activeCycle = useMemo(() => {
    if (!cycle) return undefined;
    return cycleState(cycle) === 'Em andamento' ? cycle : undefined;
  }, [cycle]);

  const activeEmployees = useMemo(() => {
    return employees
      .filter(e => e.active)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [employees]);

  const departmentEmployees = useMemo(() => {
    if (!selectedDepartment) return [];
    return activeEmployees.filter(e => normalizeDepartment(e.department) === selectedDepartment);
  }, [activeEmployees, selectedDepartment]);

  const activeLeaders = useMemo(() => {
    return activeEmployees.filter(e => e.isLeader);
  }, [activeEmployees]);

  const respondent = useMemo(() => {
    return activeEmployees.find(e => e.id === respondentId);
  }, [activeEmployees, respondentId]);

  const targetLeader = useMemo((): Employee | undefined => {
    if (selectedLeaderId) {
      return activeLeaders.find(l => l.id === selectedLeaderId);
    }
    if (respondent?.leaderId) {
      return activeEmployees.find(e => e.id === respondent.leaderId);
    }
    if (respondent?.isLeader) {
      return activeLeaders.find(l => l.id !== respondent.id);
    }
    return undefined;
  }, [respondent, selectedLeaderId, activeLeaders, activeEmployees]);

  const evaluationObj = useMemo(() => {
    if (!activeCycle) return undefined;
    return (
      evaluations.find(e => e.cycleId === activeCycle.id && e.kind === 'leadership') ||
      evaluations.find(e => e.cycleId === activeCycle.id)
    );
  }, [activeCycle, evaluations]);

  const allQuestions = useMemo(() => {
    return LEADER_SECTIONS.flatMap(s => s.questions);
  }, []);

  const isFormComplete = useMemo(() => {
    if (!respondent || !targetLeader || !allQuestions.length) return false;
    return allQuestions.every(q => scores[q.id] >= 1 && scores[q.id] <= 4);
  }, [respondent, targetLeader, allQuestions, scores]);

  function handleDepartmentChange(dept: string) {
    setSelectedDepartment(dept);
    setRespondentId('');
    setScores({});
    setObservation('');
    setSubmitted(false);
    setErrorMessage('');

    // Pré-seleciona a líder daquele setor
    const matchedLeaderItem = FORMS_LEADERS.find(fl => fl.defaultDepartment === dept);
    if (matchedLeaderItem) {
      const leaderObj = activeLeaders.find(l => l.name.toLowerCase().includes(matchedLeaderItem.searchKey.toLowerCase()));
      if (leaderObj) setSelectedLeaderId(leaderObj.id);
    }
  }

  function handleRespondentChange(id: string) {
    setRespondentId(id);
    setScores({});
    setObservation('');
    setSubmitted(false);
    setErrorMessage('');

    const person = activeEmployees.find(e => e.id === id);
    if (person) {
      if (person.leaderId) {
        setSelectedLeaderId(person.leaderId);
      } else if (person.isLeader) {
        const otherLeader = activeLeaders.find(l => l.id !== person.id);
        if (otherLeader) setSelectedLeaderId(otherLeader.id);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCycle || !evaluationObj || !respondent || !targetLeader || !isFormComplete || submitting) {
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    try {
      await submitResponse({
        evaluationId: evaluationObj.id,
        respondentId: respondent.id,
        subjectId: targetLeader.id,
        kind: 'leadership',
        scores,
        textAnswers: observation.trim()
          ? [{ questionId: 'feedback', question: 'DEIXE UM FEEDBACKS PARA SEU LÍDER?', answer: observation.trim() }]
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
          <h1>AVALIAÇÃO | LÍDERES</h1>
          <p>
            Avaliação das lideranças da Cardiofitness. Suas respostas apoiam o desenvolvimento contínuo da gestão e da clínica.
          </p>

          <div className={styles.asidePill}>
            <ShieldCheck size={16} />
            <span>Escala oficial de 1 a 4 · Avaliação confidencial</span>
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
            <div style={{ background: '#fff', border: '1px solid #d1fae5', borderRadius: 16, padding: '48px 32px', textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
                <CheckCircle2 size={38} />
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: '#065f46', marginBottom: 12 }}>
                AGRADECEMOS SUA PARTICIPAÇÃO!
              </h2>
              <p style={{ color: '#047857', fontSize: 15, lineHeight: 1.6, maxWidth: 500, margin: '0 auto 28px' }}>
                Sua avaliação sobre <b>{targetLeader?.name}</b> foi registrada com sucesso no <b>{activeCycle.name}</b>.
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

              {/* Cabeçalho */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: '8px solid #0573b9', borderRadius: 14, padding: '24px', marginBottom: 20 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                  AVALIAÇÃO | LÍDERES
                </h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                  Selecione seu setor e seu nome para responder aos critérios de avaliação da liderança.
                </p>
              </div>

              {/* Seção 1: Identificação (Setor + Nome) */}
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

                {/* 2. QUAL O SEU NOME? */}
                {selectedDepartment && (
                  <div style={{ marginBottom: 22, paddingTop: 18, borderTop: '1px solid #f1f5f9' }}>
                    <label className={styles.fieldLabel} style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8, display: 'block' }}>
                      2. Qual o seu nome? *
                    </label>
                    <select
                      className={styles.input}
                      style={{ fontSize: 15, fontWeight: 500 }}
                      value={respondentId}
                      onChange={e => handleRespondentChange(e.target.value)}
                      required
                    >
                      <option value="">-- Escolha seu nome na lista do setor {selectedDepartment} --</option>
                      {departmentEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 3. QUAL É A LÍDER RESPONSÁVEL PELO SEU SETOR? */}
                {respondent && (
                  <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #e2e8f0' }}>
                    <label className={styles.fieldLabel} style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8, display: 'block' }}>
                      3. Qual é a líder responsável pelo seu setor? *
                    </label>
                    <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 12px' }}>
                      A líder do seu setor foi pré-selecionada. Você pode confirmar ou selecionar outra se necessário.
                    </p>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {FORMS_LEADERS.map(fl => {
                        const leaderObj = activeLeaders.find(l => l.name.toLowerCase().includes(fl.searchKey.toLowerCase()));
                        const leaderId = leaderObj?.id || '';
                        const isSelected = (selectedLeaderId || targetLeader?.id) === leaderId;

                        return (
                          <label
                            key={fl.displayName}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '12px 16px',
                              borderRadius: 10,
                              border: `2px solid ${isSelected ? '#0573b9' : '#e2e8f0'}`,
                              background: isSelected ? '#f0f7fd' : '#fff',
                              cursor: 'pointer',
                              fontWeight: isSelected ? 700 : 500,
                              color: isSelected ? '#0573b9' : '#334155',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <input
                              type="radio"
                              name="leaderSelection"
                              value={leaderId}
                              checked={isSelected}
                              onChange={() => setSelectedLeaderId(leaderId)}
                              required
                            />
                            <span>{fl.displayName}</span>
                            {isSelected && (
                              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#0573b9', fontWeight: 600 }}>
                                Selecionada
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Seção 2: LÍDERES (Critérios com títulos de blocos) */}
              {respondent && targetLeader && (
                <>
                  <div style={{ background: '#0573b9', borderRadius: 12, padding: '16px 20px', color: '#fff', marginBottom: 20 }}>
                    <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85, fontWeight: 700 }}>
                      CRITÉRIOS DE AVALIAÇÃO
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 800, margin: '4px 0 0' }}>
                      AVALIAÇÃO DA LIDERANÇA — {targetLeader.name}
                    </h3>
                  </div>

                  {LEADER_SECTIONS.map(section => (
                    <div key={section.title} style={{ marginBottom: 28 }}>
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 18px', marginBottom: 14 }}>
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#334155', letterSpacing: '0.04em' }}>
                          {section.title}
                        </h4>
                      </div>

                      <div className={styles.questions}>
                        {section.questions.map(q => (
                          <fieldset key={q.id} className={styles.questionCard}>
                            <legend style={{ fontWeight: 600, color: '#0f172a', fontSize: 14, lineHeight: 1.5 }}>
                              {q.title} *
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
                    </div>
                  ))}

                  {/* Campo de Feedback Aberto */}
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '24px', marginBottom: 24 }}>
                    <label className={styles.fieldLabel} style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8, display: 'block' }}>
                      DEIXE UM FEEDBACKS PARA SEU LÍDER?
                    </label>
                    <textarea
                      className={styles.textarea}
                      placeholder="Texto de resposta curta..."
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
                          <Send size={18} /> Enviar Avaliação
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

export default function LeadershipEvaluationPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Carregando...</div>}>
      <LeadershipEvaluationContent />
    </Suspense>
  );
}
