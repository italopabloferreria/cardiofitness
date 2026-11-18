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
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { cycleState, formatDate } from '@/lib/analytics';
import type { Employee, ScoreQuestion } from '@/lib/types';
import styles from '@/components/native-prototype.module.css';

const SCALE_LABELS: Record<number, string> = {
  1: 'Precisa melhorar',
  2: 'Em desenvolvimento',
  3: 'Atende',
  4: 'Supera',
};

// Blocos e perguntas exatas do formulário de líderes oficial (Google Forms)
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

// As 5 líderes oficiais que aparecem no Google Forms
const FORMS_LEADERS = [
  { displayName: 'LIDIA VIANA', searchKey: 'Lídia' },
  { displayName: 'CLEUMA', searchKey: 'Cleuma' },
  { displayName: 'GABRIEL', searchKey: 'Gabriel' },
  { displayName: 'WELISSON', searchKey: 'Welisson' },
  { displayName: 'MARIA', searchKey: 'Maria Alzirene' },
];

function LeadershipEvaluationContent() {
  const { data, status, submitResponse } = useApp();

  const [respondentId, setRespondentId] = useState('');
  const [selectedLeaderId, setSelectedLeaderId] = useState('');
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
    return data.employees
      .filter(e => e.active)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [data.employees]);

  const activeLeaders = useMemo(() => {
    return activeEmployees.filter(e => e.isLeader);
  }, [activeEmployees]);

  const respondent = useMemo(() => {
    return activeEmployees.find(e => e.id === respondentId);
  }, [activeEmployees, respondentId]);

  // Líder a ser avaliado
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

  // Avaliação do ciclo correspondente
  const evaluationObj = useMemo(() => {
    if (!activeCycle) return undefined;
    return (
      data.evaluations.find(e => e.cycleId === activeCycle.id && e.kind === 'leadership') ||
      data.evaluations.find(e => e.cycleId === activeCycle.id)
    );
  }, [activeCycle, data.evaluations]);

  const allQuestions = useMemo(() => {
    return LEADER_SECTIONS.flatMap(s => s.questions);
  }, []);

  const isFormComplete = useMemo(() => {
    if (!respondent || !targetLeader || !allQuestions.length) return false;
    return allQuestions.every(q => scores[q.id] >= 1 && scores[q.id] <= 4);
  }, [respondent, targetLeader, allQuestions, scores]);

  function handleRespondentChange(id: string) {
    setRespondentId(id);
    setScores({});
    setObservation('');
    setSubmitted(false);
    setErrorMessage('');

    const person = activeEmployees.find(e => e.id === id);
    if (person) {
      // Auto-seleciona a líder vinculada ao colaborador
      if (person.leaderId) {
        setSelectedLeaderId(person.leaderId);
      } else if (person.isLeader) {
        const otherLeader = activeLeaders.find(l => l.id !== person.id);
        if (otherLeader) setSelectedLeaderId(otherLeader.id);
      }
    } else {
      setSelectedLeaderId('');
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
          <div className={styles.asideEyebrow}>FORMULÁRIO OFICIAL</div>
          <h1>AVALIAÇÃO | LÍDERES</h1>
          <p>
            Avaliação das lideranças da Cardiofitness. Suas respostas apoiam o desenvolvimento contínuo da nossa gestão.
          </p>

          <div className={styles.asidePill}>
            <ShieldCheck size={16} />
            <span>Escala oficial de 1 a 4 · Conforme Google Forms</span>
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
            /* Caso 2: Avaliação enviada com sucesso (Seção 3: Agradecemos sua participação) */
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

              {/* Cabeçalho do Forms */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: '8px solid #0573b9', borderRadius: 14, padding: '24px', marginBottom: 20 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                  AVALIAÇÃO | LÍDERES
                </h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                  Selecione seu nome e responda aos critérios de avaliação da liderança.
                </p>
              </div>

              {/* Seção 1: Identificação */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '24px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                {/* 1. QUAL O SEU NOME? */}
                <div style={{ marginBottom: 24 }}>
                  <label className={styles.fieldLabel} style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8, display: 'block' }}>
                    QUAL O SEU NOME? *
                  </label>
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
                </div>

                {/* 2. QUAL É A LÍDER RESPONSÁVEL PELO SEU SETOR? */}
                {respondent && (
                  <div>
                    <label className={styles.fieldLabel} style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8, display: 'block' }}>
                      QUAL É A LÍDER RESPONSÁVEL PELO SEU SETOR? *
                    </label>
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
                      SEÇÃO 2 DE 3
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 800, margin: '4px 0 0' }}>
                      LÍDERES
                    </h3>
                  </div>

                  {LEADER_SECTIONS.map((section, sIdx) => (
                    <div key={section.title} style={{ marginBottom: 28 }}>
                      {/* Título do Bloco (DESEMPENHO, TRABALHO EM EQUIPE, LIDERANÇA, CULTURA) */}
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

                  {/* Campo de Feedback Aberto do Google Forms */}
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
