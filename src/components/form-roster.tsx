'use client';
import { useState } from 'react';
import type { RosterPreview } from '@/lib/google/roster';

export function FormRoster({ evaluationId }: { evaluationId: string }) {
  const [preview, setPreview] = useState<RosterPreview | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  async function prepare() {
    setBusy(true); setMessage(''); setPreview(null); setConfirmed(false);
    try {
      const response = await fetch(`/api/google/forms/${evaluationId}/roster`, { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Não foi possível preparar a prévia.');
      setPreview(body);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao preparar a prévia.'); }
    finally { setBusy(false); }
  }
  async function apply() {
    if (!preview || !confirmed) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/google/forms/${evaluationId}/roster`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ formId: preview.formId, revisionId: preview.revisionId, signature: preview.signature, confirm: true }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Não foi possível confirmar a atualização.');
      setPreview(null); setConfirmed(false);
      setMessage(`${body.applied} lista(s) de nomes atualizada(s). Confira o formulário antes de distribuir o link.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao confirmar a atualização.'); setPreview(null); setConfirmed(false); }
    finally { setBusy(false); }
  }
  return <section aria-label="Atualizar nomes no Google Forms">
    <h3>Nomes no Google Forms</h3>
    <p>Prepare uma prévia com os colaboradores ativos. Confira as listas antes de alterar o formulário.</p>
    <button type="button" className="button" disabled={busy} onClick={prepare}>{busy ? 'Aguarde…' : 'Conferir nomes do formulário'}</button>
    {message && <p role="status">{message}</p>}
    {preview && <div>
      {preview.warnings.map(w => <p key={w}>{w}</p>)}
      {!preview.writeEnabled && <p role="status">Prévia disponível. Para aplicar, autorize a edição dos formulários pela conta Google e ative essa conexão no servidor.</p>}
      {preview.blocked.length > 0 && <div role="alert"><strong>Conferência manual necessária</strong><ul>{preview.blocked.map((w, i) => <li key={i}>{w}</li>)}</ul></div>}
      {!preview.changes.length && !preview.blocked.length && <p>As listas de nomes já correspondem aos cadastros ativos.</p>}
      {preview.changes.map(change => <details key={change.questionId} open>
        <summary>{change.title} — {change.department}</summary>
        <div><strong>Lista atual ({change.before.length})</strong><p>{change.before.join('; ')}</p></div>
        <div><strong>Lista proposta ({change.after.length})</strong><p>{change.after.join('; ')}</p></div>
      </details>)}
      {preview.changes.length > 0 && <>
        <label><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={busy || !preview.writeEnabled || Boolean(preview.blocked.length)} /> Conferi os nomes e autorizo atualizar somente estas listas no formulário.</label>
        <button type="button" className="button primary" disabled={busy || !confirmed || !preview.writeEnabled || Boolean(preview.blocked.length)} onClick={apply}>Atualizar listas no Google Forms</button>
      </>}
    </div>}
  </section>;
}
