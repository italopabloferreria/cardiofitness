'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, HeartPulse, LoaderCircle, Send } from 'lucide-react';
import { cycleState, formatDate } from '@/lib/analytics';
import { normalizeDepartment } from '@/lib/roster-data';
import { questionsForDepartment } from '@/lib/native/evaluation-mapping';
import { usePublicForm } from '@/lib/use-public-form';
import type { Employee, EvaluationKind } from '@/lib/types';
import styles from './native-prototype.module.css';

const SCALE_LABELS = ['Precisa melhorar', 'Em desenvolvimento', 'Atende', 'Supera'];

export function PublicEvaluationForm() {
  const { cycle, employees, evaluations, loading, error, submitResponse } = usePublicForm();
  const [evaluationId, setEvaluationId] = useState('');
  const [respondentId, setRespondentId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [observation, setObservation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const activeCycle = cycle && cycleState(cycle) === 'Em andamento' ? cycle : null;
  const currentEvaluations = useMemo(() => activeCycle
    ? evaluations.filter(item => item.cycleId === activeCycle.id && item.sourceType === 'native')
    : [], [activeCycle, evaluations]);
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
  const respondent = participants.find(item => item.id === respondentId);

  const respondentOptions = useMemo(() => {
    if (!evaluation) return participants;
    if (evaluation.kind === 'leadership') return participants.filter(item => !!activeCycle?.participants.find(link => link.employeeId === item.id)?.leaderId && !item.isLeader);
    if (evaluation.kind === 'leader_to_employee') return cyclePeople.filter(item => leaderIds.has(item.id));
    if (evaluation.kind === 'self' || evaluation.kind === 'team') return participants.filter(item => !item.isLeader && !leaderIds.has(item.id));
    return participants;
  }, [activeCycle, cyclePeople, evaluation, leaderIds, participants]);

  const subjectOptions = useMemo(() => {
    if (!evaluation || !respondent) return [];
    if (evaluation.kind === 'leadership') {
      const leaderId = activeCycle?.participants.find(item => item.employeeId === respondent.id)?.leaderId;
      const leader = cyclePeople.find(item => item.id === leaderId);
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
  }, [activeCycle, cyclePeople, evaluation, leaderIds, participants, respondent]);

  const subject = subjectOptions.find(item => item.id === subjectId);
  const questions = evaluation
    ? questionsForDepartment(evaluation.mapping.scoreQuestions, evaluation.questionSections, respondent?.department || '')
    : [];
  const isComplete = !!evaluation && !!respondent && !!subject && questions.length > 0 &&
    questions.every(question => scores[question.id] >= question.min && scores[question.id] <= question.max);

  function resetForm() {
    setRespondentId(''); setSubjectId(''); setScores({}); setObservation(''); setSubmitted(false); setSubmitError('');
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!activeCycle || !evaluation || !respondent || !subject || !isComplete || submitting) return;
    setSubmitting(true); setSubmitError('');
    const kind: EvaluationKind = evaluation.kind === 'team' && respondent.id === subject.id ? 'self' : evaluation.kind;
    try {
      await submitResponse({
        evaluationId: evaluation.id,
        respondentId: respondent.id,
        subjectId: subject.id,
        kind,
        scores,
        textAnswers: observation.trim() ? [{ questionId: 'observation', question: 'Observações', answer: observation.trim() }] : [],
      });
      setSubmitted(true);
    } catch (submitFailure) {
      setSubmitError(submitFailure instanceof Error ? submitFailure.message : 'Não foi possível registrar a avaliação.');
    } finally { setSubmitting(false); }
  }

  return <div className={styles.portal}>
    <aside className={styles.portalAside}>
      <div className={styles.brand}><span className={styles.brandIcon}><HeartPulse size={24}/></span><span>Cardiofitness <small>Gestão de Pessoas</small></span></div>
      <div className={styles.asideCenter}>
        <div className={styles.asideEyebrow}>QUESTIONÁRIO DE AVALIAÇÃO</div>
        <h1>Avaliação de Desempenho</h1>
        <p>Responda às perguntas do ciclo aberto. O painel de acompanhamento é exclusivo do RH.</p>
        <div className={styles.asidePill}><CheckCircle2 size={16}/><span>Escala de 1 a 4</span></div>
      </div>
      <div className={styles.asideFooter}>Cardiofitness · Cardiologia e Medicina Preventiva</div>
    </aside>

    <main className={styles.portalMain}>
      <div className={styles.formShell}>
        {loading ? <div role="status" className={styles.emptyState}><LoaderCircle className="spin" size={30}/>Carregando questionário…</div>
          : error ? <div role="alert" className={styles.emptyState}><b>Questionário indisponível</b><span>{error}</span></div>
          : !activeCycle || !currentEvaluations.length ? <div className={styles.emptyState}><b>Não há ciclo aberto</b><span>O RH ainda não abriu um ciclo de avaliação.</span></div>
          : submitted ? <div className={styles.successState} role="status"><CheckCircle2 size={44}/><h2>Avaliação registrada</h2><p>Obrigado por responder. Você pode fechar esta página ou preencher outra avaliação disponível.</p><button type="button" className={styles.primaryButton} onClick={resetForm}>Responder outra avaliação</button></div>
          : <>
            <div className={styles.cycleBanner}><b><CalendarDays size={18}/> {activeCycle.name}</b><span>Disponível até {formatDate(activeCycle.endDate)}</span></div>
            <h2 className={styles.formTitle}>Questionário do ciclo</h2>
            <p className={styles.subtle}>Selecione a avaliação, informe quem responde e quem está sendo avaliado, e marque uma nota por pergunta.</p>
            <form onSubmit={submit} className={styles.form}>
              <label className={styles.fieldLabel}>Avaliação
                <select className={styles.input} value={evaluation?.id || ''} onChange={event => { setEvaluationId(event.target.value); resetForm(); }} required>
                  {currentEvaluations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className={styles.fieldLabel}>Quem está respondendo?
                <select className={styles.input} value={respondentId} onChange={event => { setRespondentId(event.target.value); setSubjectId(''); setScores({}); setObservation(''); setSubmitError(''); }} required>
                  <option value="">Selecione seu nome</option>
                  {respondentOptions.map(item => <option key={item.id} value={item.id}>{item.name} · {item.department}</option>)}
                </select>
              </label>
              <label className={styles.fieldLabel}>Quem está sendo avaliado?
                <select className={styles.input} value={subjectId} onChange={event => { setSubjectId(event.target.value); setScores({}); setSubmitError(''); }} required disabled={!respondent}>
                  <option value="">Selecione uma pessoa</option>
                  {subjectOptions.map(item => <option key={item.id} value={item.id}>{item.name} · {item.department}{item.id === respondentId ? ' (autoavaliação)' : ''}</option>)}
                </select>
              </label>

              {questions.map((question, index) => <fieldset className={styles.questionCard} key={question.id}>
                <legend><span className={styles.questionNumber}>{String(index + 1).padStart(2, '0')}</span>{question.title}</legend>
                <div className={styles.ratingOptions}>{[1, 2, 3, 4].map(value => <label className={scores[question.id] === value ? styles.selectedRating : styles.rating} key={value}>
                  <input type="radio" name={question.id} value={value} checked={scores[question.id] === value} onChange={() => setScores(previous => ({ ...previous, [question.id]: value }))}/>
                  <b>{value}</b><small>{SCALE_LABELS[value - 1]}</small>
                </label>)}</div>
              </fieldset>)}

              <label className={styles.fieldLabel}>Observações (opcional)
                <textarea className={styles.input} maxLength={3000} rows={4} value={observation} onChange={event => setObservation(event.target.value)} placeholder="Escreva um comentário para o RH, se desejar."/>
              </label>
              {submitError && <div role="alert" className={styles.formError}>{submitError}</div>}
              <button className={styles.primaryButton} disabled={!isComplete || submitting} type="submit">{submitting ? <LoaderCircle className="spin" size={17}/> : <Send size={17}/>} Enviar avaliação</button>
            </form>
          </>}
      </div>
    </main>
  </div>;
}
