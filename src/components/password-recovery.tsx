'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, LoaderCircle, LockKeyhole } from 'lucide-react';

const SENT = 'Se o endereço estiver cadastrado, enviaremos um link de recuperação. Abra o link no e-mail usando este mesmo navegador. Confira também a pasta de spam.';

async function post(path: string, body: Record<string, string>) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(typeof result.error === 'string' ? result.error : 'Não foi possível concluir a recuperação. Tente novamente.'), { status: response.status });
}

export default function PasswordRecovery({ initialEmail, code, demo, onBack }: { initialEmail: string; code?: string; demo: boolean; onBack: (message?: string) => void }) {
  const [email, setEmail] = useState(initialEmail), [sent, setSent] = useState(false);
  const [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!remaining) return;
    const timer = window.setTimeout(() => setRemaining(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    if (demo || busy || remaining) return;
    setBusy(true); setError('');
    try {
      await post('/api/auth/recovery/request', { email: email.trim() });
      setSent(true); setRemaining(60);
    } catch (error) {
      if ((error as { status?: number }).status === 429) setRemaining(60);
      setError(error instanceof Error ? error.message : 'Não foi possível enviar o link.');
    } finally { setBusy(false); }
  }

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (demo || busy) return;
    setError('');
    if (password !== confirmation) { setError('As senhas não coincidem.'); return; }
    if (new TextEncoder().encode(password).length > 72) { setError('A senha excede o limite de 72 bytes. Use uma senha menor.'); return; }
    setBusy(true);
    try {
      if (!code) throw new Error('Abra o link de recuperação recebido no e-mail.');
      await post('/api/auth/recovery/confirm', { code, newPassword: password, confirmation });
      setPassword(''); setConfirmation('');
      onBack('Senha redefinida. Entre com seu e-mail e a nova senha.');
    } catch (error) {
      if ((error as { status?: number }).status === 429) setRemaining(60);
      setError(error instanceof Error ? error.message : 'Não foi possível redefinir a senha.');
    } finally { setBusy(false); }
  }

  return <form className="access-box recovery-box" onSubmit={code ? confirm : send} aria-busy={busy}>
    <span className="access-kicker"><span /> ACESSO EXCLUSIVO DO RH</span>
    <h2>Recupere seu acesso.</h2>
    <p>{code ? 'Crie uma nova senha para entrar no sistema Cardiofitness.' : 'Informe o e-mail cadastrado no sistema para receber um link de recuperação.'}</p>
    {demo && <div className="notice notice-error" role="alert">Recuperação disponível somente para contas reais.</div>}
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    {sent && <div className="notice notice-success" role="status">{SENT}</div>}
    {!code && <label className="field"><span>E-mail</span><input type="email" autoComplete="username" required maxLength={254} value={email} disabled={busy || sent || demo} onChange={event => setEmail(event.target.value)} /></label>}
    {code && <>
      <label className="field"><span>Nova senha</span><input type="password" autoComplete="new-password" required minLength={12} maxLength={72} disabled={busy} value={password} onChange={event => setPassword(event.target.value)} /><small>Use pelo menos 12 caracteres. Esta senha pertence ao sistema, não ao Gmail.</small></label>
      <label className="field"><span>Confirmar nova senha</span><input type="password" autoComplete="new-password" required minLength={12} maxLength={72} disabled={busy} value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
    </>}
    {(code || !sent) && <button className="button primary full password-submit" disabled={busy || demo || remaining > 0}>{busy ? <LoaderCircle size={18} className="spin" /> : <LockKeyhole size={18} />}{code ? remaining ? `Aguarde ${remaining}s` : 'Salvar nova senha' : remaining ? `Aguarde ${remaining}s` : 'Enviar link de recuperação'}</button>}
    {sent && !code && <button type="button" className="text-button recovery-secondary" disabled={busy || remaining > 0} onClick={() => void send()}>{remaining ? `Reenviar link em ${remaining}s` : 'Reenviar link'}</button>}
    <button type="button" className="text-button recovery-secondary" disabled={busy} onClick={() => onBack()}><ArrowLeft size={15} /> Voltar para o login</button>
  </form>;
}
