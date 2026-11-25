'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, HeartPulse, LoaderCircle, Send } from 'lucide-react';
import { cycleState, formatDate } from '@/lib/analytics';
import { normalizeDepartment } from '@/lib/roster-data';
import { questionsForDepartment } from '@/lib/native/evaluation-mapping';
import { usePublicForm } from '@/lib/use-public-form';
import type { EvaluationKind } from '@/lib/types';
import styles from './native-prototype.module.css';

const SCALE_LABELS = ['Precisa melhorar', 'Em desenvolvimento', 'Atende', 'Supera'];

export interface PublicEvaluationFormProps {
  forcedKind?: 'leadership' | 'team';
}

export function PublicEvaluationForm({ forcedKind }: PublicEvaluationFormProps = {}) {
  const { cycle, employees, evaluations, submittedPairs, loading, error, submitResponse } = usePublicForm();
  const [evaluationId, setEvaluationId] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [respondentId, setRespondentId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [observation, setObservation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const activeCycle = cycle && cycleState(cycle) === 'Em andamento' ? cycle : null;
  const currentEvaluations = useMemo(() => {
    if (!activeCycle) return [];
    const evals = evaluations.filter(item => item.cycleId === activeCycle.id && item.sourceType === 'native');
    if (forcedKind) {
      const match = evals.filter(item => item.kind === forcedKind);
      return match.length > 0 ? match : evals;
    }
    return evals;
  }, [activeCycle, evaluations, forcedKind]);

  const evaluation = currentEvaluations.find(item => item.id === evaluationId) ?? currentEvaluations[0];
  const participants = useMemo(() => {
    if (!activeCycle) return [];
    const participantIds = new Set(activeCycle.participants.map(item => item.employeeId));
    return employees.filter(item => participantIds.has(item.id)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [activeCycle, employees]);

  const cyclePeople = useMemo(() => {
    if (!activeCycle) return [];
    const ids = new Set(activeCycle.participants.flatMap(item => [item.employeeId, ...(item.leaderId ? [item.leaderId] : [])]));
    return employees.filter(item => ids.has(item.id)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [activeCycle, employees]);

  const leaderIds = useMemo(() => new Set(activeCycle?.participants.flatMap(item => item.leaderId ? [item.leaderId] : []) || []), [activeCycle]);

  // Colaboradores que podem responder a esta modalidade de avaliação
  const respondentOptions = useMemo(() => {
    if (!evaluation) return participants;
    if (evaluation.kind === 'leadership') {
      return participants.filter(item => !!(activeCycle?.participants.find(link => link.employeeId === item.id)?.leaderId || item.leaderId) && !item.isLeader);
    }
    if (evaluation.kind === 'leader_to_employee') {
      return cyclePeople.filter(item => leaderIds.has(item.id));
    }
    if (evaluation.kind === 'self' || evaluation.kind === 'team') {
      return participants.filter(item => !item.isLeader && !leaderIds.has(item.id));
    }
    return participants;
  }, [activeCycle, cyclePeople, evaluation, leaderIds, participants]);

  // Lista única de setores disponíveis ordenados alfabeticamente
  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    for (const item of respondentOptions) {
      const d = item.department?.trim();
      if (d) set.add(d.toLocaleUpperCase('pt-BR'));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [respondentOptions]);

  // Colaboradores filtrados pelo setor selecionado
  const departmentRespondents = useMemo(() => {
    if (!departmentFilter) return respondentOptions;
    return respondentOptions.filter(item => item.department?.trim().toLocaleUpperCase('pt-BR') === departmentFilter);
  }, [respondentOptions, departmentFilter]);

  const respondent = participants.find(item => item.id === respondentId);

  // Líder direto do colaborador selecionado
  const leaderId = useMemo(() => {
    if (!activeCycle || !respondent) return undefined;
    return activeCycle.participants.find(item => item.employeeId === respondent.id)?.leaderId || respondent.leaderId;
  }, [activeCycle, respondent]);

  const leader = useMemo(() => {
    if (!leaderId) return undefined;
    return cyclePeople.find(item => item.id === leaderId);
  }, [cyclePeople, leaderId]);

  // Auto-seleciona o líder se for avaliação de liderança
  useEffect(() => {
    if (evaluation?.kind === 'leadership' && leader?.id && subjectId !== leader.id) {
      setSubjectId(leader.id);
    }
  }, [evaluation?.kind, leader?.id, subjectId]);

  // Sujeitos avaliáveis base
  const subjectOptions = useMemo(() => {
    if (!evaluation || !respondent) return [];
    if (evaluation.kind === 'leadership') {
      return leader ? [leader] : [];
    }
    if (evaluation.kind === 'leader_to_employee') {
      return participants.filter(item => activeCycle?.participants.some(link => link.employeeId === item.id && link.leaderId === respondent.id));
    }
    if (evaluation.kind === 'self') return [respondent];

    const sameDepartment = normalizeDepartment(respondent.department).toUpperCase().trim();
    return participants.filter(item => item.id === respondent.id || (!item.isLeader && !leaderIds.has(item.id) &&
      normalizeDepartment(item.department).toUpperCase().trim() === sameDepartment &&
      !respondent.isLeader
    ));
  }, [activeCycle, evaluation, leader, leaderIds, participants, respondent]);

  // Sujeitos que ainda NÃO foram avaliados por este colaborador neste ciclo
  const pendingSubjectOptions = useMemo(() => {
    if (!evaluation || !respondent) return [];
    if (evaluation.kind === 'leadership') return subjectOptions;
    return subjectOptions.filter(subj => {
      return !submittedPairs.some(p =>
        p.evaluationId === evaluation.id &&
        p.respondentId === respondent.id &&
        p.subjectId === subj.id
      );
    });
  }, [evaluation, respondent, subjectOptions, submittedPairs]);

  const subject = evaluation?.kind === 'leadership'
    ? leader
    : subjectOptions.find(item => item.id === subjectId);

  const questions = evaluation
    ? questionsForDepartment(evaluation.mapping.scoreQuestions, evaluation.questionSections, respondent?.department || '')
    : [];

  const hasObservation = observation.trim().length > 0;
  const isComplete = !!evaluation && !!respondent && !!subject && questions.length > 0 &&
    questions.every(question => scores[question.id] >= question.min && scores[question.id] <= question.max) &&
    hasObservation;

  // Verificação de liderança já avaliada
  const hasEvaluatedLeader = useMemo(() => {
    if (!evaluation || !respondent || !leader) return false;
    return submittedPairs.some(p =>
      p.evaluationId === evaluation.id &&
      p.respondentId === respondent.id &&
      p.subjectId === leader.id
    );
  }, [evaluation, respondent, leader, submittedPairs]);

  // Verificação se concluiu toda a equipe (colegas + autoavaliação)
  const hasCompletedAllTeam = useMemo(() => {
    return evaluation?.kind === 'team' && !!respondent && subjectOptions.length > 0 && pendingSubjectOptions.length === 0;
  }, [evaluation?.kind, respondent, subjectOptions.length, pendingSubjectOptions.length]);

  function resetForm() {
    setDepartmentFilter('');
    setRespondentId('');
    setSubjectId('');
    setScores({});
    setObservation('');
    setSubmitted(false);
    setSubmitError('');
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!activeCycle || !evaluation || !respondent || !subject || submitting) return;
    if (!observation.trim()) {
      setSubmitError('Por favor, registre pelo menos uma observação em texto antes de finalizar.');
      return;
    }
    if (!isComplete) return;
    setSubmitting(true);
    setSubmitError('');
    const kind: EvaluationKind = evaluation.kind === 'team' && respondent.id === subject.id ? 'self' : evaluation.kind;
    try {
      await submitResponse({
        evaluationId: evaluation.id,
        respondentId: respondent.id,
        subjectId: subject.id,
        kind,
        scores,
        textAnswers: [{ questionId: 'observation', question: 'Observações', answer: observation.trim() }],
      });
      setSubmitted(true);
    } catch (submitFailure) {
      setSubmitError(submitFailure instanceof Error ? submitFailure.message : 'Não foi possível registrar a avaliação.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.portal}>
      <aside className={styles.portalAside}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}><HeartPulse size={24}/></span>
          <span>Cardiofitness <small>Gestão de Pessoas</small></span>
        </div>
        <div className={styles.asideCenter}>
          <div className={styles.asideEyebrow}>QUESTIONÁRIO DE AVALIAÇÃO</div>
          <h1>
            {forcedKind === 'leadership'
              ? 'Avaliação de Líderes'
              : forcedKind === 'team'
                ? 'Avaliação da Equipe'
                : 'Avaliação de Desempenho'}
          </h1>
          <p>
            {forcedKind === 'leadership'
              ? 'Responda à avaliação das lideranças do ciclo. O painel de acompanhamento é exclusivo do RH.'
              : forcedKind === 'team'
                ? 'Responda à sua autoavaliação e à avaliação dos colegas de equipe. O painel é exclusivo do RH.'
                : 'Responda às perguntas do ciclo aberto. O painel de acompanhamento é exclusivo do RH.'}
          </p>
          <div className={styles.asidePill}><CheckCircle2 size={16}/><span>Escala de 1 a 4</span></div>
        </div>
        <div className={styles.asideFooter}>Cardiofitness · Cardiologia e Medicina Preventiva</div>
      </aside>

      <main className={styles.portalMain}>
        <div className={styles.formShell}>
          {loading ? (
            <div role="status" className={styles.emptyState}>
              <LoaderCircle className="spin" size={30}/>Carregando questionário…
            </div>
          ) : error ? (
            <div role="alert" className={styles.emptyState}>
              <b>Questionário indisponível</b>
              <span>{error}</span>
            </div>
          ) : !activeCycle || !currentEvaluations.length ? (
            <div className={styles.emptyState}>
              <b>Não há ciclo aberto</b>
              <span>O RH ainda não abriu um ciclo de avaliação.</span>
            </div>
          ) : submitted ? (
            <div className={styles.successState} role="status">
              <CheckCircle2 size={44}/>
              <h2>Avaliação registrada com sucesso!</h2>
              {evaluation?.kind === 'team' && pendingSubjectOptions.length > 0 ? (
                <>
                  <p>
                    Sua avaliação foi salva! Restam <strong>{pendingSubjectOptions.length}</strong> {pendingSubjectOptions.length === 1 ? 'avaliação pendente' : 'avaliações pendentes'} para você responder na sua equipe.
                  </p>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => {
                      setSubjectId('');
                      setScores({});
                      setObservation('');
                      setSubmitted(false);
                      setSubmitError('');
                    }}
                  >
                    Avaliar próximo colega ({pendingSubjectOptions.length} restante{pendingSubjectOptions.length === 1 ? '' : 's'})
                  </button>
                </>
              ) : evaluation?.kind === 'team' ? (
                <>
                  <p>
                    Parabéns, <strong>{respondent?.name.toLocaleUpperCase('pt-BR')}</strong>! Você concluiu 100% das avaliações da sua equipe e a autoavaliação no ciclo <strong>{activeCycle.name}</strong>. Muito obrigado pela sua colaboração!
                  </p>
                  <button type="button" className={styles.secondaryButton} onClick={resetForm}>
                    Voltar ao início
                  </button>
                </>
              ) : (
                <>
                  <p>
                    Obrigado por responder, <strong>{respondent?.name.toLocaleUpperCase('pt-BR')}</strong>! Sua avaliação da liderança foi gravada com sucesso no ciclo <strong>{activeCycle.name}</strong>.
                  </p>
                  <button type="button" className={styles.secondaryButton} onClick={resetForm}>
                    Concluir
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              <div className={styles.cycleBanner}>
                <b><CalendarDays size={18}/> {activeCycle.name}</b>
                <span>Disponível até {formatDate(activeCycle.endDate)}</span>
              </div>
              <h2 className={styles.formTitle}>{evaluation?.name || 'Questionário do ciclo'}</h2>
              <p className={styles.subtle}>Selecione seu setor e seu nome para carregar o questionário correspondente.</p>

              <form onSubmit={submit} className={styles.form}>
                {!forcedKind && currentEvaluations.length > 1 && (
                  <label className={styles.fieldLabel}>Avaliação
                    <select
                      className={styles.input}
                      value={evaluation?.id || ''}
                      onChange={event => {
                        setEvaluationId(event.target.value);
                        resetForm();
                      }}
                      required
                    >
                      {currentEvaluations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>
                )}

                <label className={styles.fieldLabel}>Qual é o seu setor na clínica?
                  <select
                    className={styles.input}
                    value={departmentFilter}
                    onChange={event => {
                      setDepartmentFilter(event.target.value);
                      setRespondentId('');
                      setSubjectId('');
                      setScores({});
                      setObservation('');
                      setSubmitError('');
                    }}
                    required
                  >
                    <option value="">SELECIONE SEU SETOR ({availableDepartments.length} SETORES DISPONÍVEIS)</option>
                    {availableDepartments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </label>

                <label className={styles.fieldLabel}>Quem está respondendo?
                  <select
                    className={styles.input}
                    value={respondentId}
                    onChange={event => {
                      const newRespId = event.target.value;
                      setRespondentId(newRespId);
                      setScores({});
                      setObservation('');
                      setSubmitError('');
                      if (evaluation?.kind === 'leadership') {
                        const lid = activeCycle?.participants.find(item => item.employeeId === newRespId)?.leaderId;
                        setSubjectId(lid || '');
                      } else {
                        setSubjectId('');
                      }
                    }}
                    required
                    disabled={!departmentFilter}
                  >
                    <option value="">
                      {!departmentFilter
                        ? 'PRIMEIRO SELECIONE O SEU SETOR ACIMA'
                        : `SELECIONE SEU NOME (${departmentRespondents.length} COLABORADOR${departmentRespondents.length === 1 ? '' : 'ES'})`}
                    </option>
                    {departmentRespondents.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name.toLocaleUpperCase('pt-BR')}
                      </option>
                    ))}
                  </select>
                </label>

                {evaluation?.kind === 'leadership' && respondent && (
                  hasEvaluatedLeader ? (
                    <div
                      role="status"
                      className={styles.emptyState}
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        color: '#166534',
                        padding: '24px 20px',
                        borderRadius: '12px',
                        marginTop: '8px',
                        minHeight: 'auto',
                      }}
                    >
                      <CheckCircle2 size={36} style={{ color: '#16a34a', margin: '0 auto 6px' }} />
                      <b style={{ fontSize: '18px', color: '#14532d' }}>Avaliação da liderança já realizada!</b>
                      <p style={{ margin: '6px 0 0', fontSize: '13px', lineHeight: 1.5, color: '#166534' }}>
                        Olá, <strong>{respondent.name.toLocaleUpperCase('pt-BR')}</strong>! Você já enviou a avaliação da sua liderança (<strong>{leader?.name.toLocaleUpperCase('pt-BR')}</strong>) no ciclo <strong>{activeCycle.name}</strong>. Não é necessário reenviar.
                      </p>
                    </div>
                  ) : (
                    <div className={styles.fieldLabel}>
                      Líder avaliado(a)
                      <div
                        className={styles.input}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          background: '#f1f5f9',
                          fontWeight: 700,
                          color: '#0f172a',
                          letterSpacing: '0.3px',
                        }}
                      >
                        {leader
                          ? `${leader.name.toLocaleUpperCase('pt-BR')} · LÍDER DO SETOR ${leader.department.toLocaleUpperCase('pt-BR')}`
                          : 'NENHUM LÍDER VINCULADO AO SEU CADASTRO NESTE CICLO'}
                      </div>
                    </div>
                  )
                )}

                {evaluation?.kind !== 'leadership' && respondent && (
                  hasCompletedAllTeam ? (
                    <div
                      role="status"
                      className={styles.emptyState}
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        color: '#166534',
                        padding: '24px 20px',
                        borderRadius: '12px',
                        marginTop: '8px',
                        minHeight: 'auto',
                      }}
                    >
                      <CheckCircle2 size={36} style={{ color: '#16a34a', margin: '0 auto 6px' }} />
                      <b style={{ fontSize: '18px', color: '#14532d' }}>Toda a equipe foi avaliada! 🎉</b>
                      <p style={{ margin: '6px 0 0', fontSize: '13px', lineHeight: 1.5, color: '#166534' }}>
                        Parabéns, <strong>{respondent.name.toLocaleUpperCase('pt-BR')}</strong>! Você já concluiu sua autoavaliação e a avaliação de todos os <strong>{Math.max(0, subjectOptions.length - 1)}</strong> colegas do setor <strong>{departmentFilter || respondent.department.toLocaleUpperCase('pt-BR')}</strong> no ciclo <strong>{activeCycle.name}</strong>.
                      </p>
                    </div>
                  ) : (
                    <label className={styles.fieldLabel}>Quem está sendo avaliado?
                      <select
                        className={styles.input}
                        value={subjectId}
                        onChange={event => {
                          setSubjectId(event.target.value);
                          setScores({});
                          setSubmitError('');
                        }}
                        required
                        disabled={!respondent || pendingSubjectOptions.length === 0}
                      >
                        <option value="">
                          {!respondent
                            ? 'SELECIONE QUEM ESTÁ RESPONDENDO PRIMEIRO'
                            : pendingSubjectOptions.length === 0
                              ? 'TODOS OS COLEGAS JÁ FORAM AVALIADOS'
                              : `SELECIONE UMA PESSOA (RESTAM ${pendingSubjectOptions.length} DE ${subjectOptions.length})`}
                        </option>
                        {pendingSubjectOptions.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.id === respondentId
                              ? `${item.name.toLocaleUpperCase('pt-BR')} (SUA AUTOAVALIAÇÃO)`
                              : item.name.toLocaleUpperCase('pt-BR')}
                          </option>
                        ))}
                      </select>
                    </label>
                  )
                )}

                {!hasEvaluatedLeader && !hasCompletedAllTeam && subject && (
                  <>
                    {questions.map((question, index) => (
                      <fieldset className={styles.questionCard} key={question.id}>
                        <legend>
                          <span className={styles.questionNumber}>{String(index + 1).padStart(2, '0')}</span>
                          {question.title}
                        </legend>
                        <div className={styles.ratingOptions}>
                          {[1, 2, 3, 4].map(value => (
                            <label className={scores[question.id] === value ? styles.selectedRating : styles.rating} key={value}>
                              <input
                                type="radio"
                                name={question.id}
                                value={value}
                                checked={scores[question.id] === value}
                                onChange={() => setScores(previous => ({ ...previous, [question.id]: value }))}
                              />
                              <b>{value}</b>
                              <small>{SCALE_LABELS[value - 1]}</small>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ))}

                    <label className={styles.fieldLabel}>
                      <span style={{ display: 'block', marginBottom: 8 }}>Observações <strong style={{ color: '#b42318' }}>(obrigatório) *</strong></span>
                      <textarea
                        className={styles.input}
                        maxLength={3000}
                        rows={4}
                        required
                        value={observation}
                        onChange={event => {
                          setObservation(event.target.value);
                          if (submitError) setSubmitError('');
                        }}
                        placeholder="Escreva pelo menos uma observação ou feedback para finalizar a avaliação."
                      />
                      {!hasObservation && (
                        <small style={{ display: 'block', marginTop: 6, color: '#b42318', fontSize: 12, fontWeight: 500 }}>
                          Preencha pelo menos uma observação em texto para liberar o envio.
                        </small>
                      )}
                    </label>
                    {submitError && <div role="alert" className={styles.formError}>{submitError}</div>}
                    <button className={styles.primaryButton} disabled={!isComplete || submitting} type="submit">
                      {submitting ? <LoaderCircle className="spin" size={17}/> : <Send size={17}/>} Enviar avaliação
                    </button>
                  </>
                )}
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
