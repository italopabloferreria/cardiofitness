'use client';
import { useEffect, useState, type FormEvent } from 'react';
type Account = { id: string; name: string; email: string; isAdmin: boolean };
type Event = { id: number; actor_id: string; target_email: string; action: string; is_admin: boolean; created_at: string };
type State = { isAdmin: boolean; currentUserId: string; users: Account[]; events: Event[] };
const labels: Record<string, string> = { authorize: 'ACESSO AUTORIZADO', role: 'PERFIL ALTERADO', revoke: 'ACESSO REVOGADO' };

export default function RhAccess({ mode }: { mode: 'demo' | 'live' }) {
  const [state, setState] = useState<State | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(''), [name, setName] = useState(''), [isAdmin, setAdmin] = useState(false);
  async function refresh() {
    const response = await fetch('/api/rh-users', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Não foi possível consultar os acessos.');
    setState(result);
  }
  useEffect(() => { if (mode === 'live') refresh().catch(error => setError(error.message)); }, [mode]);
  async function change(method: string, path: string, body?: unknown) {
    setBusy(true); setError('');
    try {
      const response = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível atualizar o acesso.');
      await refresh();
      if (method === 'POST') { setEmail(''); setName(''); setAdmin(false); }
    } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível atualizar o acesso.'); }
    finally { setBusy(false); }
  }
  function authorize(event: FormEvent) {
    event.preventDefault();
    if (mode !== 'live' || busy || !state?.isAdmin) return;
    if (!window.confirm(`Autorizar ${email} a consultar avaliações e gerenciar os dados do RH${isAdmin ? ', incluindo autorizar outras contas' : ''}?`)) return;
    void change('POST', '/api/rh-users', { email, name, isAdmin });
  }
  return <section className="panel padded" aria-busy={busy}>
    <h3>ACESSOS DO RH</h3>
    <p>Contas individuais permitem identificar quem gerencia os acessos. Revogar acesso não apaga avaliações nem exclui a conta Google.</p>
    {mode === 'demo' && <p className="notice">Gestão de contas disponível somente no ambiente real.</p>}
    {error && <p className="notice notice-error" role="alert">{error}</p>}
    {mode === 'live' && state && !state.isAdmin && <p>Somente um administrador autorizado pode consultar e alterar os acessos.</p>}
    {state?.isAdmin && <>
      <form className="rh-access-form" onSubmit={authorize}>
        <p>A conta precisa existir no Supabase Auth. Esta ação não cria senha nem envia convites por e-mail.</p>
        <label className="field">NOME<input required maxLength={140} value={name} onChange={e => setName(e.target.value.toLocaleUpperCase('pt-BR'))} disabled={busy} /></label>
        <label className="field">E-MAIL<input required type="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} disabled={busy} /></label>
        <label><input type="checkbox" checked={isAdmin} onChange={e => setAdmin(e.target.checked)} disabled={busy} /> ADMINISTRADOR — PODE GERENCIAR OUTRAS CONTAS</label>
        <button className="button primary" disabled={busy} type="submit">AUTORIZAR CONTA EXISTENTE</button>
      </form>
      <div className="table-scroll"><table><thead><tr><th>NOME</th><th>E-MAIL</th><th>PERFIL</th><th>AÇÕES</th></tr></thead><tbody>{state.users.map(account => <tr key={account.id}>
        <td>{account.name}</td><td>{account.email}</td><td>{account.isAdmin ? 'ADMINISTRADOR' : 'RH'}</td><td>
          <button className="button small" type="button" disabled={busy || account.id === state.currentUserId} onClick={() => { if (window.confirm(`Alterar o perfil de ${account.email} para ${account.isAdmin ? 'RH' : 'ADMINISTRADOR'}?`)) void change('PATCH', `/api/rh-users/${account.id}`, { isAdmin: !account.isAdmin }); }}>ALTERAR PERFIL</button>
          <button type="button" disabled={busy || account.id === state.currentUserId} onClick={() => { if (window.confirm(`Revogar o acesso de ${account.email}? A pessoa perderá acesso ao painel. Os resultados permanecerão preservados.`)) void change('DELETE', `/api/rh-users/${account.id}`); }}>REVOGAR ACESSO</button>
        </td></tr>)}</tbody></table></div>
      <h4>ÚLTIMAS ALTERAÇÕES DE ACESSO</h4>
      {state.events.length ? <ul>{state.events.map(event => <li key={event.id}>{new Date(event.created_at).toLocaleString('pt-BR')} — {labels[event.action] || event.action} — {event.target_email} — RESPONSÁVEL: {state.users.find(user => user.id === event.actor_id)?.name || event.actor_id}</li>)}</ul> : <p>Nenhuma alteração registrada.</p>}
    </>}
  </section>;
}
