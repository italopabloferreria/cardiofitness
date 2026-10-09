import 'server-only';
import { JWT, OAuth2Client } from 'google-auth-library';
import type { FormMetadata, FormQuestion } from '../types';
import type { GoogleForm, GoogleFormResponse, GoogleQuestion } from './types';

export type { GoogleFormResponse } from './types';
export { normalizeResponses } from './normalize';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/forms.body.readonly',
  'https://www.googleapis.com/auth/forms.responses.readonly',
];
const REQUEST_TIMEOUT = 8_000;
const SYNC_TIMEOUT = 45_000;

export function isGoogleConfigured(): boolean {
  return Boolean((process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN)
    || (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY));
}

export function validateGoogleFormId(formId: string): string {
  if (formId.startsWith('1FAIp') || formId.includes('/forms/d/e/')) {
    throw new Error('Este é o link público de respostas. A Forms API exige o ID da URL de edição: docs.google.com/forms/d/ID_DO_FORMULARIO/edit. Peça essa URL ao proprietário do formulário.');
  }
  if (!/^[a-zA-Z0-9_-]{20,200}$/.test(formId)) throw new Error('Informe somente o ID do formulário encontrado na URL de edição, sem a URL completa.');
  return formId;
}

async function accessToken(): Promise<string> {
  if (!isGoogleConfigured()) throw new Error('Conexão Google Forms pendente. Configure OAuth ou uma conta de serviço autorizada no servidor.');
  try {
    const transporterOptions = { timeout: REQUEST_TIMEOUT, retryConfig: { retry: 1 } };
    const auth = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN
      ? new OAuth2Client({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, transporterOptions })
      : new JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n'), scopes: GOOGLE_SCOPES, transporterOptions });
    if (auth instanceof OAuth2Client && !(auth instanceof JWT)) auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const token = await auth.getAccessToken();
    if (!token.token) throw new Error();
    return token.token;
  } catch {
    throw new Error('Não foi possível autenticar no Google. Revise as credenciais e a autorização da conta no servidor.');
  }
}

async function request<T>(path: string, token: string, deadline: number): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('O Google demorou para responder. Tente sincronizar novamente.');
    let response: Response;
    try {
      response = await fetch(`https://forms.googleapis.com/v1/forms/${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(Math.min(REQUEST_TIMEOUT, remaining)), cache: 'no-store', redirect: 'error',
      });
    } catch {
      if (attempt === 2) throw new Error('Falha de comunicação com o Google Forms. Tente novamente.');
      await new Promise(resolve => setTimeout(resolve, 300 * 2 ** attempt));
      continue;
    }
    if (response.ok) {
      try { return await response.json() as T; }
      catch { throw new Error('O Google Forms retornou dados inválidos.'); }
    }
    // Never include Google response bodies: authentication failures can contain secrets.
    if (response.status === 401) throw new Error('A autorização do Google expirou ou foi revogada. Autorize a conta novamente.');
    if (response.status === 403) throw new Error('A conta Google não tem acesso ao formulário, a Forms API está desativada ou faltam os escopos de leitura.');
    if (response.status === 404) throw new Error('Formulário não encontrado. Confira o ID da URL de edição e o acesso da conta Google.');
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 2) throw new Error(`Não foi possível consultar o Google Forms (HTTP ${response.status}). Tente novamente.`);
    const retryAfter = Number(response.headers.get('retry-after'));
    await new Promise(resolve => setTimeout(resolve, Math.min(2_000, retryAfter > 0 ? retryAfter * 1000 : 300 * 2 ** attempt)));
  }
  throw new Error('Não foi possível consultar o Google Forms.');
}

function scale(question: GoogleQuestion, grid?: GoogleQuestion['choiceQuestion']): { min: number; max: number; numeric: boolean } {
  if (question.scaleQuestion) return { min: question.scaleQuestion.low, max: question.scaleQuestion.high, numeric: true };
  if (question.ratingQuestion) return { min: 1, max: question.ratingQuestion.ratingScaleLevel, numeric: true };
  const choice = question.choiceQuestion ?? grid;
  const options = choice?.options?.map(option => option.value.trim()) ?? [];
  if (choice?.type !== 'CHECKBOX' && options.length > 1 && options.every(option => /^\d+$/.test(option))) {
    const numbers = [...new Set(options.map(Number))].sort((a, b) => a - b);
    // Mapping represents an integer interval, so reject choice scales with gaps.
    if (numbers.length === numbers[numbers.length - 1] - numbers[0] + 1) return { min: numbers[0], max: numbers[numbers.length - 1], numeric: true };
  }
  return { min: 0, max: 0, numeric: false };
}

export async function getFormMetadata(formId: string): Promise<FormMetadata> {
  const id = validateGoogleFormId(formId);
  const deadline = Date.now() + SYNC_TIMEOUT;
  const form = await request<GoogleForm>(id, await accessToken(), deadline);
  if (!form.formId || !Array.isArray(form.items)) throw new Error('Metadados inválidos retornados pelo Google Forms.');
  const questions: FormQuestion[] = [];
  let section = '';
  for (const item of form.items) {
    if (item.pageBreakItem) section = item.title ?? '';
    const rows = item.questionItem?.question ? [item.questionItem.question] : item.questionGroupItem?.questions ?? [];
    for (const question of rows) {
      if (!question.questionId) continue;
      questions.push({ id: question.questionId, title: question.rowQuestion?.title ? `${item.title ?? ''} · ${question.rowQuestion.title}` : item.title ?? 'Pergunta sem título', section, freeText: Boolean(question.textQuestion), ...scale(question, item.questionGroupItem?.grid?.columns) });
    }
  }
  return { id: form.formId, title: form.info?.title ?? form.info?.documentTitle ?? 'Formulário', responderUri: form.responderUri ?? '',
    collectsEmail: ['VERIFIED', 'RESPONDER_INPUT'].includes(form.settings?.emailCollectionType ?? ''), questions };
}

export async function getFormResponses(formId: string): Promise<GoogleFormResponse[]> {
  const id = validateGoogleFormId(formId);
  const deadline = Date.now() + SYNC_TIMEOUT;
  const token = await accessToken();
  const responses: GoogleFormResponse[] = [];
  const seenPages = new Set<string>();
  let pageToken = '';
  do {
    const query = new URLSearchParams({ pageSize: '1000' });
    if (pageToken) query.set('pageToken', pageToken);
    const page = await request<{ responses?: GoogleFormResponse[]; nextPageToken?: string }>(`${id}/responses?${query}`, token, deadline);
    if (page.responses !== undefined && !Array.isArray(page.responses)) throw new Error('O Google Forms retornou uma lista de respostas inválida.');
    if (page.responses?.some(response => !response || typeof response.responseId !== 'string' || typeof response.lastSubmittedTime !== 'string')) throw new Error('O Google Forms retornou uma resposta inválida.');
    responses.push(...page.responses ?? []);
    pageToken = page.nextPageToken ?? '';
    if (typeof pageToken !== 'string' || (pageToken && seenPages.has(pageToken))) throw new Error('O Google Forms retornou uma paginação inválida.');
    if (pageToken) seenPages.add(pageToken);
    if (responses.length > 100_000 || seenPages.size > 100) throw new Error('O formulário excede o limite de uma sincronização. Separe as avaliações por formulário ou ciclo.');
  } while (pageToken);
  return responses;
}
