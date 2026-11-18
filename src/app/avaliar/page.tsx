'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  HeartPulse,
  KeyRound,
  LoaderCircle,
  LogOut,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  UsersRound,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { nativeQuestions } from '@/lib/native/templates';
import { formatDate } from '@/lib/analytics';
import { findEmployeeByToken } from '@/lib/roster-data';
import type { Employee, EvaluationKind, ScoreQuestion } from '@/lib/types';
import styles from '@/components/native-prototype.module.css';

interface AssignmentItem {
  id: string;
  kind: EvaluationKind;
  evaluationId: string;
  evaluationName: string;
  subject: Employee;
  title: string;
  categoryBadge: string;
  categoryIcon: string;
  description: string;
}

const SCALE_LABELS: Record<number, string> = {
  1: 'Precisa melhorar',
  2: 'Em desenvolvimento',
  3: 'Atende',
  4: 'Supera',
};

function PortalContent() {
  const { data, status, submitResponse } = useApp();
  const searchParams = useSearchParams();
  const cycleParam = searchParams.get('ciclo') || searchParams.get('cycleId');
  const tokenParam = (searchParams.get('p') || searchParams.get('token') || searchParams.get('colaborador') || '').trim();

  const [respondentId, setRespondentId] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [observation, setObservation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Active cycle: RH defines the cycle; the permanent link always loads it
  const activeCycle = useMemo(() => {
    if (!data.cycles.length) return undefined;
    if (cycleParam) {
      const found = data.cycles.find(c => c.id === cycleParam);
      if (found) return found;
    }
    const today = new Date().toISOString().slice(0, 10);
    const ongoing = data.cycles.find(c => c.startDate <= today && today <= c.endDate);
    if (ongoing) return ongoing;
    return [...data.cycles].sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
  }, [data.cycles, cycleParam]);

  const activeEmployees = useMemo(() => {
    return data.employees.filter(e => e.active).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [data.employees]);

  // Automatically authenticate when a valid personal token is in the URL
  useEffect(() => {
    if (tokenParam && data.employees.length) {
      const matched = findEmployeeByToken(tokenParam, data.employees);
      if (matched && matched.active) {
        setRespondentId(matched.id);
        setTokenError('');
      } else {
        setTokenError(`Código de acesso "${tokenParam}" não encontrado entre os colaboradores ativos.`);
      }
    }
  }, [tokenParam, data.employees]);

  const respondent = useMemo(() => {
    return activeEmployees.find(e => e.id === respondentId);
  }, [activeEmployees, respondentId]);

  // Compute assignments for the selected respondent in activeCycle
  const assignments = useMemo((): AssignmentItem[] => {
    if (!respondent || !activeCycle) return [];
    const cycleEvals = data.evaluations.filter(e => e.cycleId === activeCycle.id);
    const list: AssignmentItem[] = [];

    // 1. Modality: Colaborador avalia Líder (se tiver liderança vinculada)
    if (!respondent.isLeader && respondent.leaderId) {
      const leader = data.employees.find(e => e.id === respondent.leaderId);
      const evalObj = cycleEvals.find(e => e.kind === 'leadership') || cycleEvals[0];
      if (leader && evalObj) {
        list.push({
          id: `lead-${leader.id}`,
          kind: 'leadership',
          evaluationId: evalObj.id,
          evaluationName: evalObj.name,
          subject: leader,
          title: `Avaliação da Liderança: ${leader.name}`,
          categoryBadge: 'Colaborador avalia Líder',
          categoryIcon: '👔',
          description: `Avalie o suporte, comunicação, clareza e gestão de ${leader.name} no setor ${respondent.department}.`,
        });
      }
    }

    // 2. Modality: Líder avalia Colaborador (se for líder, avalia todos os seus liderados)
    if (respondent.isLeader) {
      const subordinates = data.employees.filter(
        e => e.active && e.leaderId === respondent.id
      );
      const evalObj = cycleEvals.find(e => e.kind === 'leader_to_employee') || cycleEvals.find(e => e.kind === 'team') || cycleEvals[0];
      if (evalObj) {
        for (const sub of subordinates) {
          list.push({
            id: `sub-${sub.id}`,
            kind: 'leader_to_employee',
            evaluationId: evalObj.id,
            evaluationName: evalObj.name,
            subject: sub,
            title: `Avaliação de Colaborador: ${sub.name}`,
            categoryBadge: 'Líder avalia Colaborador',
            categoryIcon: '👥',
            description: `Avalie o desempenho técnico, pontualidade, disciplina e dedicação de ${sub.name} no setor ${sub.department}.`,
          });
        }
      }
    }

    // 3. Modality: Autoavaliação (todos os colaboradores e líderes)
    const selfEval = cycleEvals.find(e => e.kind === 'self') || cycleEvals.find(e => e.kind === 'team') || cycleEvals[0];
    if (selfEval) {
      list.push({
        id: `self-${respondent.id}`,
        kind: 'self',
        evaluationId: selfEval.id,
        evaluationName: selfEval.name,
        subject: respondent,
        title: 'Autoavaliação de Desempenho',
        categoryBadge: 'Autoavaliação',
        categoryIcon: '👤',
        description: 'Reflita com sinceridade sobre seu próprio desempenho, responsabilidade, entregas e pontos de desenvolvimento.',
      });
    }

    // 4. Modality: Avaliação entre colegas do mesmo setor (kind: 'team')
    const teamEval = cycleEvals.find(e => e.kind === 'team') || cycleEvals[0];
    if (teamEval) {
      const peers = data.employees.filter(
        e => e.active && e.department === respondent.department && e.id !== respondent.id && !e.isLeader
      );
      for (const peer of peers) {
        list.push({
          id: `peer-${peer.id}`,
          kind: 'team',
          evaluationId: teamEval.id,
          evaluationName: teamEval.name,
          subject: peer,
          title: `Avaliação de Colega: ${peer.name}`,
          categoryBadge: 'Equipe (Entre colegas)',
          categoryIcon: '👥',
          description: `Avalie a colaboração, trabalho em equipe e compromisso de ${peer.name} no setor ${peer.department}.`,
        });
      }
    }

    return list;
  }, [respondent, activeCycle, data.evaluations, data.employees]);

  // Selected assignment
  const selectedAssignment = useMemo(() => {
    return assignments.find(a => a.id === selectedAssignmentId);
  }, [assignments, selectedAssignmentId]);

  // Resolve questions for the selected assignment
  const questions = useMemo((): ScoreQuestion[] => {
    if (!selectedAssignment) return [];
    const evalObj = data.evaluations.find(e => e.id === selectedAssignment.evaluationId);
    if (evalObj?.mapping?.scoreQuestions?.length) {
      return evalObj.mapping.scoreQuestions;
    }
    const templateQs = nativeQuestions(selectedAssignment.kind, selectedAssignment.subject.department);
    return templateQs.map(q => ({
      id: q.id,
      title: q.title,
      min: 1,
      max: 4,
    }));
  }, [selectedAssignment, data.evaluations]);

  const isComplete = useMemo(() => {
    if (!questions.length) return false;
    return questions.every(q => scores[q.id] >= 1 && scores[q.id] <= 4);
  }, [questions, scores]);

  const completedCount = useMemo(() => {
    if (!respondent) return 0;
    return assignments.filter(a =>
      data.responses.some(
        r => r.evaluationId === a.evaluationId && r.respondentId === respondent.id && r.subjectId === a.subject.id
      )
    ).length;
  }, [assignments, data.responses, respondent]);

  function handleSelectAssignment(assignmentId: string) {
    setSelectedAssignmentId(assignmentId);
    const target = assignments.find(a => a.id === assignmentId);
    if (target && respondent) {
      // Pre-fill if already answered
      const existing = data.responses.find(
        r => r.evaluationId === target.evaluationId && r.respondentId === respondent.id && r.subjectId === target.subject.id
      );
      if (existing) {
        setScores(existing.scores || {});
        setObservation(existing.textAnswers?.[0]?.answer || '');
      } else {
        setScores({});
        setObservation('');
      }
    }
    setErrorMessage('');
    setSuccessMessage('');
  }

  function handleManualTokenSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    const matched = findEmployeeByToken(tokenInput.trim(), data.employees);
    if (matched && matched.active) {
      setRespondentId(matched.id);
      setTokenError('');
    } else {
      setTokenError(`Código "${tokenInput.trim()}" não encontrado. Verifique com o RH.`);
    }
  }

  async function handleSubmit() {
    if (!selectedAssignment || !respondent || !isComplete || submitting) return;
    setSubmitting(true);
    setErrorMessage('');
    try {
      await submitResponse({
        evaluationId: selectedAssignment.evaluationId,
        respondentId: respondent.id,
        subjectId: selectedAssignment.subject.id,
        kind: selectedAssignment.kind,
        scores,
        textAnswers: observation.trim()
          ? [{ questionId: 'observacoes', question: 'Observações e pontos de desenvolvimento', answer: observation.trim() }]
          : [],
      });
      setSuccessMessage(`Avaliação de ${selectedAssignment.subject.name} enviada com sucesso! As respostas já alimentaram os relatórios e métricas do RH.`);
      setSelectedAssignmentId('');
      setScores({});
      setObservation('');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Não foi possível salvar a avaliação.');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className={styles.portal} style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <LoaderCircle size={40} className="spin" style={{ color: 'var(--blue)', margin: '0 auto 16px' }} />
          <h2>Carregando o portal de avaliações...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.portal}>
      <aside className={styles.portalAside}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}><HeartPulse size={24} /></span>
          <span>Cardiofitness <small>Gestão de Pessoas</small></span>
        </div>
        <div className={styles.asideCenter}>
          <div className={styles.asideEyebrow}>ESCUTAR. DESENVOLVER. EVOLUIR.</div>
          <h1>Seu olhar faz a diferença.</h1>
          <p>
            Portal de avaliação de desempenho integrado. Avalie sua liderança, sua equipe e o próprio desenvolvimento com transparência, segurança e respeito.
          </p>
          <div className={styles.asidePill}>
            <ClipboardCheck size={18} /> Respostas computadas em tempo real
          </div>
        </div>
        <span className={styles.asideFooter}>
          Cardiofitness · Cardiologia e Medicina Preventiva
        </span>
      </aside>

      <main className={styles.portalMain}>
        <div className={styles.topLinks}>
          <Link className={styles.textLink} href="/">
            <ArrowLeft size={16} /> Painel do RH
          </Link>
          {activeCycle && (
            <span className={styles.previewChip}>
              Ciclo: {activeCycle.name}
            </span>
          )}
        </div>

        <div className={styles.prototypeNotice}>
          <ShieldCheck size={20} />
          <span>
            <b>Portal Oficial de Avaliações.</b> Suas notas na escala de 1 a 4 são registradas com total segurança e alimentam o plano de desenvolvimento da Cardiofitness.
          </span>
        </div>

        {errorMessage && (
          <p role="alert" className={styles.inlineNotice} style={{ background: '#fef3f2', borderColor: '#fecdca', color: '#b42318', padding: '12px 16px', borderRadius: 8, margin: '14px 0' }}>
            {errorMessage}
          </p>
        )}

        {tokenError && (
          <p role="alert" className={styles.inlineNotice} style={{ background: '#fef3f2', borderColor: '#fecdca', color: '#b42318', padding: '12px 16px', borderRadius: 8, margin: '14px 0' }}>
            {tokenError}
          </p>
        )}

        {successMessage && (
          <div className={styles.inlineNotice} role="status" style={{ background: '#ecfdf3', borderColor: '#abefc6', color: '#067647', padding: '14px 18px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
            <CheckCircle2 size={20} /> {successMessage}
          </div>
        )}

        {/* Step 1: Identification (when no respondent is identified yet) */}
        {!respondent && (
          <section className={styles.formShell}>
            <div className={styles.roundIcon}><User size={30} /></div>
            <h2>Acesse suas avaliações</h2>
            <p className={styles.subtle}>
              Cada colaborador tem um link permanente de acesso. Digite seu código de acesso abaixo ou selecione seu nome para entrar.
            </p>

            <form className={styles.formBox} onSubmit={handleManualTokenSubmit}>
              <label className={styles.fieldLabel} htmlFor="token-input">
                <KeyRound size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                Código de Acesso Individual
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  id="token-input"
                  className={styles.input}
                  placeholder="Ex: ana-karolina, welisson-franca..."
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                />
                <button type="submit" className={styles.primaryButton}>
                  Entrar
                </button>
              </div>
              <p className={styles.fieldHelp}>
                Dica: O link enviado pelo WhatsApp pelo RH já entra automaticamente com o seu código.
              </p>
            </form>

            <div className={styles.formBox} style={{ background: '#fafbfc', borderStyle: 'dashed' }}>
              <label className={styles.fieldLabel} htmlFor="select-respondent">
                Ou selecione na lista (Modo Demonstração / RH):
              </label>
              <select
                id="select-respondent"
                className={styles.input}
                value={respondentId}
                onChange={e => {
                  setRespondentId(e.target.value);
                  setSelectedAssignmentId('');
                  setSuccessMessage('');
                  setTokenError('');
                }}
              >
                <option value="">Selecione um dos 35 colaboradores ativos...</option>
                {activeEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} — {emp.department} {emp.isLeader ? '(Liderança)' : emp.formName.includes('Estagi') ? '(Estagiário)' : ''}
                  </option>
                ))}
              </select>
              <p className={styles.fieldHelp}>
                {activeEmployees.length} colaboradores ativos de acordo com o quadro oficial da Cardiofitness.
              </p>
            </div>
          </section>
        )}

        {/* Step 2: Assignments List & Answering */}
        {respondent && (
          <section className={styles.questionShell}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 15, marginBottom: 20 }}>
              <div>
                <div className={styles.eyebrow} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} /> COLABORADOR IDENTIFICADO
                </div>
                <h2 style={{ margin: '4px 0' }}>Olá, {respondent.name.split(' ')[0]}!</h2>
                <p className={styles.subtle} style={{ margin: 0 }}>
                  <b>{respondent.name}</b> · Setor: <b>{respondent.department}</b> {respondent.isLeader ? '· Liderança' : ''}
                </p>
              </div>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setRespondentId('');
                  setSelectedAssignmentId('');
                  setSuccessMessage('');
                }}
                style={{ fontSize: 11, padding: '8px 12px' }}
              >
                <LogOut size={14} /> Trocar de colaborador
              </button>
            </div>

            {/* Permanent Link Info Banner */}
            <div style={{ background: '#f0f7fd', border: '1px solid #cbe3f5', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: '#165782', lineHeight: 1.5 }}>
              <b>💡 Link Permanente:</b> Este seu link individual sempre abrirá as avaliações do ciclo ativo atual da Cardiofitness (atualmente: <b>{activeCycle?.name}</b>). Salve este endereço nos seus favoritos!
            </div>

            {/* Overall Progress for respondent */}
            <div className={styles.formBox} style={{ marginTop: 0, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                  Suas avaliações neste ciclo ({completedCount} de {assignments.length} concluídas)
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)' }}>
                  {assignments.length ? Math.round((completedCount / assignments.length) * 100) : 0}%
                </span>
              </div>
              <div className={styles.progressBar} style={{ margin: '6px 0' }}>
                <span style={{ width: `${assignments.length ? (completedCount / assignments.length) * 100 : 0}%` }} />
              </div>
            </div>

            {/* If no assignment currently selected, show the list of assignments */}
            {!selectedAssignment && (
              <div style={{ display: 'grid', gap: 14 }}>
                {assignments.map(a => {
                  const existing = data.responses.find(
                    r => r.evaluationId === a.evaluationId && r.respondentId === respondent.id && r.subjectId === a.subject.id
                  );
                  const isDone = !!existing;
                  return (
                    <div
                      key={a.id}
                      className={styles.questionCard}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 15,
                        borderColor: isDone ? '#cbe7d7' : '#dfe8f1',
                        background: isDone ? '#fafefb' : '#fff',
                      }}
                    >
                      <div style={{ minWidth: 240, maxWidth: 440 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: isDone ? '#087443' : '#0573b9' }}>
                            {a.categoryIcon} {a.categoryBadge}
                          </span>
                          {isDone ? (
                            <span style={{ background: '#d1fadf', color: '#05603a', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
                              ✓ Concluída
                            </span>
                          ) : (
                            <span style={{ background: '#fef0c7', color: '#b54708', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
                              ⏳ Pendente
                            </span>
                          )}
                        </div>
                        <h3 style={{ margin: '3px 0 6px', fontSize: 16, color: '#142c48' }}>
                          {a.title}
                        </h3>
                        <p style={{ margin: 0, fontSize: 12, color: '#687b92' }}>
                          {a.description}
                        </p>
                      </div>

                      <div>
                        {isDone ? (
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => handleSelectAssignment(a.id)}
                            style={{ fontSize: 12 }}
                          >
                            Revisar / Alterar
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={() => handleSelectAssignment(a.id)}
                            style={{ fontSize: 12 }}
                          >
                            <Send size={14} /> Responder
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {!assignments.length && (
                  <div className={styles.emptyReports} style={{ textAlign: 'center', padding: 40 }}>
                    <UsersRound size={40} style={{ color: '#8898a8', margin: '0 auto 12px' }} />
                    <b>Nenhuma avaliação pendente para o seu perfil neste ciclo.</b>
                    <p style={{ fontSize: 13, color: '#6b7d91' }}>
                      Seu cadastro está ativo. As avaliações aparecerão automaticamente conforme o calendário.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* When an assignment is being answered */}
            {selectedAssignment && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <button
                    type="button"
                    className={styles.textLink}
                    onClick={() => setSelectedAssignmentId('')}
                  >
                    <ArrowLeft size={16} /> Voltar para a lista de avaliações
                  </button>
                  <span className={styles.previewChip}>
                    {selectedAssignment.categoryBadge}
                  </span>
                </div>

                <div className={styles.formBox} style={{ background: '#f5f9fd', borderColor: '#d4e5f3', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#0573b9', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 16 }}>
                      {selectedAssignment.subject.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#0573b9' }}>
                        {selectedAssignment.kind === 'self' ? 'Sua Autoavaliação' : 'Pessoa avaliada'}
                      </span>
                      <h3 style={{ margin: '2px 0', fontSize: 18, color: '#142c48' }}>
                        {selectedAssignment.subject.name}
                      </h3>
                      <p style={{ margin: 0, fontSize: 12, color: '#65778e' }}>
                        Setor: {selectedAssignment.subject.department} {selectedAssignment.subject.isLeader ? '· Liderança' : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress of questions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#64748b' }}>
                  <span>Progresso dos critérios:</span>
                  <b>{Object.keys(scores).length} de {questions.length} respondidos</b>
                </div>
                <div className={styles.progressBar} style={{ margin: '8px 0 24px' }}>
                  <span style={{ width: `${questions.length ? (Object.keys(scores).length / questions.length) * 100 : 0}%` }} />
                </div>

                {/* Question Cards */}
                <div className={styles.questions}>
                  {questions.map((q, index) => {
                    const currentScore = scores[q.id];
                    return (
                      <fieldset className={styles.questionCard} key={q.id}>
                        <legend>
                          <span className={styles.questionNumber}>
                            {String(index + 1).padStart(2, '0')}.
                          </span>
                          {q.title}
                        </legend>
                        <div className={styles.ratingOptions}>
                          {[1, 2, 3, 4].map(num => (
                            <label
                              key={num}
                              className={currentScore === num ? styles.selectedRating : styles.rating}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                value={num}
                                checked={currentScore === num}
                                onChange={() => setScores(prev => ({ ...prev, [q.id]: num }))}
                              />
                              <b>{num}</b>
                              <small>{SCALE_LABELS[num]}</small>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    );
                  })}
                </div>

                {/* Observation / Feedback */}
                <div className={styles.formBox} style={{ marginTop: 20 }}>
                  <label className={styles.fieldLabel} htmlFor="feedback-obs">
                    Observações e comentários construtivos (opcional)
                  </label>
                  <textarea
                    id="feedback-obs"
                    className={styles.textarea}
                    rows={3}
                    value={observation}
                    onChange={e => setObservation(e.target.value)}
                    placeholder="Pontos fortes, sugestões de desenvolvimento, exemplos práticos ou elogios..."
                  />
                  <p className={styles.fieldHelp}>
                    Comentários construtivos ajudam no plano de desenvolvimento individual.
                  </p>
                </div>

                {/* Form Actions */}
                <div className={styles.formActions} style={{ marginBottom: 40 }}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setSelectedAssignmentId('')}
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={!isComplete || submitting}
                    onClick={() => void handleSubmit()}
                  >
                    {submitting ? (
                      <LoaderCircle size={16} className="spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    Enviar Avaliação
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        <footer className={styles.portalFooter}>
          <ShieldCheck size={16} /> Cardiofitness · Cardiologia e Medicina Preventiva · Portal de Avaliações
        </footer>
      </main>
    </div>
  );
}

export default function NativeEvaluationPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Carregando portal...</div>}>
      <PortalContent />
    </Suspense>
  );
}
