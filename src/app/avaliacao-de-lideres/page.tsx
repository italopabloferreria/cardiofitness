'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
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
import type { Employee, ScoreQuestion } from '@/lib/types';
import styles from '@/components/native-prototype.module.css';

const SCALE_LABELS: Record<number, string> = {
  1: 'Precisa melhorar',
  2: 'Em desenvolvimento',
  3: 'Atende',
  4: 'Supera',
};

const DEFAULT_LEADER_QUESTIONS: ScoreQuestion[] = [
  { id: 'l1', title: 'O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?', min: 1, max: 4 },
  { id: 'l2', title: 'O funcionário tem desempenhado bem sua função?', min: 1, max: 4 },
  { id: 'l3', title: 'Passa as informações necessárias para seu grupo de trabalho?', min: 1, max: 4 },
  { id: 'l4', title: 'Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?', min: 1, max: 4 },
  { id: 'l5', title: 'Consegue influenciar os demais colaboradores e motivá-los a participar das atividades propostas?', min: 1, max: 4 },
  { id: 'l6', title: 'Entende a diversidade de personalidades e consegue despertar o melhor de cada uma?', min: 1, max: 4 },
  { id: 'l7', title: 'O funcionário reflete os valores da empresa?', min: 1, max: 4 },
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
    return data.employees.filter(e => e.active).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [data.employees]);

  const activeLeaders = useMemo(() => {
    return activeEmployees.filter(e => e.isLeader);
  }, [activeEmployees]);

  const respondent = useMemo(() => {
    return activeEmployees.find(e => e.id === respondentId);
  }, [activeEmployees, respondentId]);

  // Líder a ser avaliado
  const targetLeader = useMemo((): Employee | undefined => {
    if (!respondent) return undefined;
    if (selectedLeaderId) {
      return activeLeaders.find(l => l.id === selectedLeaderId);
    }
    if (respondent.leaderId) {
      return activeEmployees.find(e => e.id === respondent.leaderId);
    }
    // Se for líder, avalia outro líder
    return activeLeaders.find(l => l.id !== respondent.id);
  }, [respondent, selectedLeaderId, activeLeaders, activeEmployees]);

  // Avaliação do ciclo correspondente
  const evaluationObj = useMemo(() => {
    if (!activeCycle) return undefined;
    return (
      data.evaluations.find(e => e.cycleId === activeCycle.id && e.kind === 'leadership') ||
      data.evaluations.find(e => e.cycleId === activeCycle.id)
    );
  }, [activeCycle, data.evaluations]);

  const questions: ScoreQuestion[] = useMemo(() => {
    if (evaluationObj?.mapping?.scoreQuestions?.length) {
      return evaluationObj.mapping.scoreQuestions;
    }
    return DEFAULT_LEADER_QUESTIONS;
  }, [evaluationObj]);

  const isFormComplete = useMemo(() => {
    if (!respondent || !targetLeader || !questions.length) return false;
    return questions.every(q => scores[q.id] >= 1 && scores[q.id] <= 4);
  }, [respondent, targetLeader, questions, scores]);

  function handleRespondentChange(id: string) {
    setRespondentId(id);
    setSelectedLeaderId('');
    setScores({});
    setObservation('');
    setSubmitted(false);
    setErrorMessage('');

    const person = activeEmployees.find(e => e.id === id);
    if (person && evaluationObj) {
      const leader = person.leaderId ? activeEmployees.find(e => e.id === person.leaderId) : null;
      if (leader) {
        const existing = data.responses.find(
          r => r.evaluationId === evaluationObj.id && r.respondentId === id && r.subjectId === leader.id
        );
        if (existing) {
          setScores(existing.scores || {});
          setObservation(existing.textAnswers?.[0]?.answer || '');
        }
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
          ? [{ questionId: 'feedback', question: 'Observações sobre a liderança', answer: observation.trim() }]
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
          <div className={styles.asideEyebrow}>FORMULÁRIO OFICIAL 1</div>
          <h1>Avaliação de Líderes</h1>
          <p>
            Seu canal para avaliar a comunicação, clareza, suporte e gestão da liderança do seu setor. Todas as respostas alimentam diretamente o desenvolvimento e aprimoramento da nossa equipe.
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
        <div className={styles.topLinks}>
          <Link href="/avaliar" className={styles.textLink}>
            ← Outros formulários
          </Link>
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
                Obrigado por sua avaliação de <b>{targetLeader?.name}</b>. Suas respostas foram registradas e computadas com sucesso no <b>{activeCycle.name}</b>.
              </p>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    setSubmitted(false);
                    setScores({});
                    setObservation('');
                  }}
                >
                  Avaliar outro líder
                </button>
                <Link href="/avaliacao-da-equipe" className={styles.primaryButton}>
                  Ir para Avaliação da Equipe <ChevronRight size={16} />
                </Link>
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

              {/* Bloco 1: Seleção de quem está avaliando */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '24px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <label className={styles.fieldLabel} style={{ fontSize: 15, color: '#0f172a', marginBottom: 6 }}>
                  1. Quem está avaliando? (Selecione seu nome) *
                </label>
                <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 14px' }}>
                  Escolha seu nome na lista para vincular a avaliação à liderança responsável pelo seu setor.
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
                      {emp.name} — {emp.department} {emp.isLeader ? '(Líder)' : ''}
                    </option>
                  ))}
                </select>

                {/* Resumo automático do setor e líder */}
                {respondent && (
                  <div style={{ marginTop: 18, padding: '14px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 13 }}>
                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>Seu setor</span>
                        <b style={{ color: '#0f172a' }}>{respondent.department}</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>Líder do seu setor</span>
                        <b style={{ color: '#0573b9', fontSize: 14 }}>
                          {targetLeader?.name || 'Selecione abaixo'}
                        </b>
                      </div>
                    </div>

                    {/* Caso a pessoa selecionada seja um líder, ela pode escolher outro líder para avaliar */}
                    {respondent.isLeader && (
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                          Como líder, selecione qual colega de liderança deseja avaliar:
                        </label>
                        <select
                          className={styles.input}
                          value={selectedLeaderId || targetLeader?.id || ''}
                          onChange={e => setSelectedLeaderId(e.target.value)}
                        >
                          {activeLeaders
                            .filter(l => l.id !== respondent.id)
                            .map(l => (
                              <option key={l.id} value={l.id}>
                                {l.name} ({l.department})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bloco 2: Perguntas de Avaliação */}
              {respondent && targetLeader && (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                      2. Questões de Avaliação da Liderança
                    </h3>
                    <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                      Avalie cada competência de <b>{targetLeader.name}</b> conforme a escala de 1 a 4.
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
                      3. Observações e Pontos de Desenvolvimento (Opcional)
                    </label>
                    <textarea
                      className={styles.textarea}
                      placeholder="Deixe comentários construtivos sobre a comunicação, liderança ou sugestões de melhoria..."
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
                      style={{ minWidth: 240, height: 50, fontSize: 15 }}
                    >
                      {submitting ? (
                        <>
                          <LoaderCircle className="spin" size={18} /> Enviando...
                        </>
                      ) : (
                        <>
                          <Send size={18} /> Enviar Avaliação de {targetLeader.name.split(' ')[0]}
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
